/**
 * AI 聊天 API：流式 SSE、上下文压缩、MCP 元数据
 */

import { buildChatStreamRequestBody } from './chat-request-body.js';
import {
  buildApiMessagesFromHistory,
  buildToolCallsFromStored,
  stringifyToolContent,
} from './message-history-builder.js';
import { applyFinalUsageToMessage, applyStepUsageToMessage } from './usage-telemetry.js';

/**
 * @typedef {object} ChatApiDeps
 * @property {() => object} getApp
 * @property {() => object} getUI
 * @property {import('./turn-collector.js').TurnCollector} TurnCollector
 * @property {typeof buildApiMessagesFromHistory} buildApiMessagesFromHistory
 * @property {import('./storage-contract.js').compactBaselineStorageKey} compactBaselineStorageKey
 */

/**
 * @param {ChatApiDeps} deps
 * @returns {object}
 */
export function createChatApi(deps) {
  const {
    getApp,
    getUI,
    TurnCollector,
    buildApiMessagesFromHistory: buildApiMessages,
    compactBaselineStorageKey,
  } = deps;

  /** @type {import('./turn-collector.js').TurnCollector | null} */
  let turnCollector = null;
  /** @type {ReadableStreamDefaultReader<Uint8Array> | null} */
  let currentReader = null;
  let userAborted = false;
  /** @type {string | null} */
  let requestId = null;
  /** @type {object | null} */
  let compactConsumeMarker = null;
  /** @type {string | null} */
  let autoCompactSummaryFromStream = null;

  /** @type {Map<string, { arguments: string }>} */
  const toolCallArgumentsMap = new Map();

  /**
   * @param {object} app
   */
  function persistMessageHistory(app) {
    // authed：服务端轮末落库（SessionEnd 钩子），同一条消息不再写本地 IDB
    if (app.sessionStore?.isAuthed?.()) {
      return;
    }
    if (typeof app.saveMessageHistory === 'function') {
      app.saveMessageHistory();
      return;
    }
    if (app.data && typeof app.data.saveMessageHistory === 'function') {
      app.data.saveMessageHistory();
    }
  }

  function saveCompactedBaselineToStorage(app) {
    // authed：压缩基线只在服务端（ChatSession.compactBaselineJson），本地不留副本
    if (app.sessionStore?.isAuthed?.()) {
      return;
    }
    if (!app?.state?.sessionId) {
      return;
    }
    const key = compactBaselineStorageKey(app.state.sessionId);
    if (app.state.compactedBaseline) {
      localStorage.setItem(key, JSON.stringify(app.state.compactedBaseline));
    } else {
      localStorage.removeItem(key);
    }
  }

  function loadCompactedBaselineFromStorage(app) {
    // authed：基线由服务端组上下文使用，本地态恒为 null（不读 localStorage）
    if (app.sessionStore?.isAuthed?.()) {
      app.state.compactedBaseline = null;
      return;
    }
    if (!app?.state?.sessionId) {
      return;
    }
    try {
      const raw = localStorage.getItem(compactBaselineStorageKey(app.state.sessionId));
      app.state.compactedBaseline = raw ? JSON.parse(raw) : null;
    } catch {
      app.state.compactedBaseline = null;
    }
  }

  /**
   * @param {object} app
   * @param {string | null} newUserContent
   * @returns {object[]}
   */
  function buildApiContextMessages(app, newUserContent) {
    let messages = [];

    if (app.state.apiContextOverride?.length) {
      messages = app.state.apiContextOverride.map((m) => ({ ...m }));
    } else if (app.state.compactedBaseline) {
      const { summaryContent, historyStartIndex } = app.state.compactedBaseline;
      const tail = app.state.messageHistory.slice(historyStartIndex);
      const tailApi = buildApiMessages(
        tail,
        Math.max(tail.length, app.state.messageHistoryCount || tail.length),
      );
      messages = [{ role: 'user', content: summaryContent }, ...tailApi];
    } else if (app.state.enableMessageHistory && app.state.messageHistory.length > 0) {
      messages = buildApiMessages(app.state.messageHistory, app.state.messageHistoryCount);
    }

    if (newUserContent) {
      messages.push({ role: 'user', content: newUserContent });
    }
    return messages;
  }

  function beginCompactConsumeTracking(app) {
    const hadOverride = !!app.state.apiContextOverride?.length;
    const overrideContent = hadOverride && app.state.apiContextOverride[0]?.content;
    compactConsumeMarker = {
      userMessageIndex: app.state.messageHistory.length,
      hadOverride,
      summaryContent: typeof overrideContent === 'string' ? overrideContent : null,
    };
    autoCompactSummaryFromStream = null;
  }

  function consumeContextCompression(app) {
    const UI = getUI();
    const marker = compactConsumeMarker;
    const autoSummary = autoCompactSummaryFromStream;

    let summaryContent = null;
    let historyStartIndex = null;

    if (marker?.hadOverride && marker.summaryContent) {
      summaryContent = marker.summaryContent;
      historyStartIndex = marker.userMessageIndex;
    } else if (typeof autoSummary === 'string' && autoSummary.trim() && marker) {
      summaryContent = autoSummary;
      historyStartIndex = marker.userMessageIndex;
    }

    compactConsumeMarker = null;
    autoCompactSummaryFromStream = null;

    if (!summaryContent || historyStartIndex === null || historyStartIndex < 0) {
      return;
    }

    app.state.compactedBaseline = { summaryContent, historyStartIndex };
    app.state.apiContextOverride = null;
    app.state.compactDraft = null;
    app.state.contextCompactedActive = false;

    const notice = app.elements?.chatMessages?.querySelector('.chat-context-notice');
    if (notice) {
      notice.remove();
    }
    if (UI?.updateContextCompactControls) {
      UI.updateContextCompactControls(false);
    }
    if (UI?.syncContextDraftPreview) {
      UI.syncContextDraftPreview();
    }

    saveCompactedBaselineToStorage(app);
  }

  function shouldConsumeAfterSuccessfulSend() {
    if (userAborted) {
      return false;
    }
    if (compactConsumeMarker?.hadOverride && compactConsumeMarker.summaryContent) {
      return true;
    }
    return !!(autoCompactSummaryFromStream && compactConsumeMarker);
  }

  function abortCurrentStream() {
    const app = getApp();
    if (currentReader) {
      userAborted = true;
      currentReader.cancel().catch(() => {});
      currentReader = null;
    }
    app.setStreamingState(false);
    app.elements.sendButton.disabled = false;
  }

  /**
   * @param {string} raw
   * @returns {object[] | null}
   */
  function parseSseDataPayload(raw) {
    const trimmed = String(raw).trim();
    if (!trimmed) {
      return [];
    }
    if (!/\}\s*\{/.test(trimmed)) {
      try {
        return [JSON.parse(trimmed)];
      } catch {
        return null;
      }
    }
    const parts = trimmed.split(/\}\s*\{/);
    const out = [];
    try {
      out.push(JSON.parse(`${parts[0]}}`));
      for (let k = 1; k < parts.length - 1; k++) {
        out.push(JSON.parse(`{${parts[k]}}`));
      }
      out.push(JSON.parse(`{${parts[parts.length - 1]}`));
    } catch {
      return null;
    }
    return out;
  }

  /**
   * @param {HTMLElement} messageDiv
   * @param {number} index
   * @param {string | undefined} toolCallId
   * @returns {HTMLElement | null}
   */
  function resolveToolCallElement(messageDiv, index, toolCallId) {
    const elements = messageDiv.querySelectorAll('.tool-call');
    if (!elements.length) {
      return null;
    }
    if (toolCallId) {
      const byId = Array.from(elements).find((el) => el.dataset.toolId === toolCallId);
      if (byId instanceof HTMLElement) {
        return byId;
      }
    }
    if (index >= 0 && elements[index] instanceof HTMLElement) {
      return elements[index];
    }
    const last = elements[elements.length - 1];
    return last instanceof HTMLElement ? last : null;
  }

  /**
   * @param {object} jsonData
   * @param {HTMLElement} aiMessageDiv
   * @param {string} fullText
   * @returns {string}
   */
  function applyStreamDataObject(jsonData, aiMessageDiv, fullText) {
    const UI = getUI();

    if (jsonData.type === 'max_tool_calls_reached') {
      const count = Array.isArray(jsonData.partialResults) ? jsonData.partialResults.length : 0;
      const notice = `\n\n[系统: 已达到最大工具调用轮次 ${jsonData.round}，${count} 个后续工具调用未执行]`;
      const next = fullText + notice;
      UI.updateAIMessage(aiMessageDiv, next);
      return next;
    }

    if (jsonData.reasoning_content) {
      console.log('jsonData(思考):', jsonData);
      UI.updateReasoningContent(aiMessageDiv, jsonData.reasoning_content);
      turnCollector?.onReasoning(jsonData.reasoning_content);
    }

    if (jsonData.tool_call) {
      console.log('jsonData(工具调用):', jsonData);
      const toolInfo = {
        name: jsonData.tool_call.name || '未命名工具',
        id: jsonData.tool_call.id,
        args: jsonData.tool_call.arguments || {},
        source: jsonData.tool_call.source,
      };
      UI.addToolCall(aiMessageDiv, toolInfo);
      turnCollector?.onToolCall(toolInfo);
    }

    if (jsonData.tool_call_update) {
      console.log('jsonData(工具调用更新):', jsonData);
      const update = jsonData.tool_call_update;
      const index = update.index ?? 0;
      const toolCallId = update.tool_call_id;

      if (update.completeArguments && toolCallId) {
        try {
          const parsed = JSON.parse(update.completeArguments);
          const argsStr = JSON.stringify(parsed, null, 2);
          console.log('收到完整工具参数:', argsStr);
          toolCallArgumentsMap.set(toolCallId, { arguments: update.completeArguments });
          turnCollector?.onToolCallUpdate(toolCallId, update.completeArguments);

          const toolElement = resolveToolCallElement(aiMessageDiv, index, toolCallId);
          const argsElement = toolElement?.querySelector('.tool-call-args');
          if (argsElement) {
            argsElement.dataset.complete = 'true';
            argsElement.textContent = argsStr;
          }
        } catch (error) {
          console.error('解析完整参数失败:', error);
        }
      } else if (update.arguments) {
        const toolElement = resolveToolCallElement(aiMessageDiv, index, toolCallId);
        const argsElement = toolElement?.querySelector('.tool-call-args');
        if (argsElement && argsElement.dataset.complete !== 'true') {
          let argsStr = '';
          try {
            const parsed = JSON.parse(update.arguments);
            argsStr = JSON.stringify(parsed, null, 2);
          } catch {
            argsStr = update.arguments;
          }
          argsElement.textContent = argsStr;
          if (!argsElement.dataset.receivingFragments) {
            argsElement.dataset.receivingFragments = 'true';
          }
        }
      }
    }

    if (jsonData.tool_progress) {
      console.log('jsonData(工具进度):', jsonData);
      UI.updateToolCallProgress(
        aiMessageDiv,
        jsonData.tool_progress.index,
        jsonData.tool_progress.progress,
        jsonData.tool_progress.total,
        jsonData.tool_progress.message,
        jsonData.tool_progress.elapsed_ms,
      );
      turnCollector?.onToolProgress(jsonData.tool_progress);
    }

    if (jsonData.permission_request) {
      const pr = jsonData.permission_request;
      UI.showPermissionPrompt(aiMessageDiv, pr, {
        onApprove: (alwaysAllow) => {
          void resolveToolPermission(
            pr.tool_call_id,
            'approve',
            alwaysAllow,
            pr.codeName,
            pr.permissionSessionKey,
          );
        },
        onDeny: () => {
          void resolveToolPermission(
            pr.tool_call_id,
            'deny',
            false,
            pr.codeName,
            pr.permissionSessionKey,
          );
        },
      });
    }

    if (jsonData.tool_call_result) {
      console.log('jsonData(工具调用结果):', jsonData);

      if (jsonData.tool_call_result.name === 'executeApi') {
        const entry = toolCallArgumentsMap.get(jsonData.tool_call_result.tool_call_id);
        if (entry) {
          const parsedArgs = JSON.parse(entry.arguments);
          window.parent.postMessage(
            {
              type: 'ai_tool_call_result',
              data: {
                apiId: parsedArgs.apiId,
                params: parsedArgs.params,
                result: jsonData.tool_call_result.result,
              },
            },
            '*',
          );
          toolCallArgumentsMap.delete(jsonData.tool_call_result.tool_call_id);
        }
      }

      turnCollector?.onToolCallResult(jsonData.tool_call_result);

      UI.updateToolCallResult(
        aiMessageDiv,
        jsonData.tool_call_result.name,
        jsonData.tool_call_result.result,
        jsonData.tool_call_result.error === true,
        jsonData.tool_call_result.index,
        jsonData.tool_call_result.tool_call_id,
        jsonData.tool_call_result.execution_time,
        jsonData.tool_call_result.artifact ?? null,
        jsonData.tool_call_result.unified ?? null,
      );
    }

    if (jsonData.step_usage) {
      applyStepUsageToMessage(aiMessageDiv, jsonData.step_usage);
    }

    if (jsonData.planning_update) {
      const planItems = jsonData.planning_update.items ?? [];
      UI.updatePlanningItems?.(planItems);
      UI.syncTodoCardPlanningSnapshot?.(aiMessageDiv, planItems);
      turnCollector?.onPlanningSnapshot?.(planItems);
    }

    if (jsonData.content) {
      if (aiMessageDiv.querySelector('.ai-thinking')) {
        UI.hideThinking(aiMessageDiv);
      }
      const newFullText = fullText + jsonData.content;
      UI.updateMainContent(aiMessageDiv, newFullText);
      return newFullText;
    }

    if (jsonData.error) {
      UI.hideThinking(aiMessageDiv);
      UI.updateAIMessage(aiMessageDiv, `错误: ${jsonData.error}`);
      UI.finalizeAIMessage(aiMessageDiv, false);
    }

    return fullText;
  }

  /**
   * @param {string} eventName
   * @param {string} eventData
   * @param {HTMLElement} aiMessageDiv
   * @param {string} fullText
   * @param {number} startTime
   * @returns {Promise<string>}
   */
  async function handleEventData(eventName, eventData, aiMessageDiv, fullText, startTime) {
    const UI = getUI();
    const app = getApp();
    const timeManager = app.timeManager;

    if (eventName === 'begin') {
      if (eventData) {
        try {
          const beginData = JSON.parse(eventData);
          if (beginData.requestId) {
            requestId = beginData.requestId;
            console.debug('[SSE] requestId:', requestId);
          }
        } catch (e) {
          console.warn('解析 begin 事件失败:', e);
        }
      }
      window.parent.postMessage({ type: 'ai_tool_call_begin', requestId }, '*');
    } else if (eventName === 'context_compacted') {
      if (eventData) {
        try {
          const compactData = JSON.parse(eventData);
          if (typeof compactData.summaryContent === 'string' && compactData.summaryContent.length > 0) {
            autoCompactSummaryFromStream = compactData.summaryContent;
          }
        } catch (e) {
          console.warn('解析 context_compacted 失败:', e);
        }
      }
      UI.addContextNotice();
      return fullText;
    } else if (eventName === 'error' && eventData) {
      try {
        const errPayload = JSON.parse(eventData);
        const msg = errPayload.error ?? '未知错误';
        UI.hideThinking(aiMessageDiv);
        UI.updateAIMessage(aiMessageDiv, `错误: ${msg}`);
        UI.finalizeAIMessage(aiMessageDiv, false);
      } catch (e) {
        console.warn('解析 error 事件失败:', e);
      }
      return fullText;
    } else if (eventName === 'usage' && eventData) {
      try {
        const usageData = JSON.parse(eventData);
        console.log('Usage数据:', usageData);

        applyFinalUsageToMessage(aiMessageDiv, usageData);

        if (usageData.elapsedTime) {
          const timeInfo = aiMessageDiv.querySelector('.ai-message-meta.message-time')
            ?? aiMessageDiv.querySelector('.message-time');
          if (timeInfo) {
            timeInfo.textContent = `${timeManager.getFullTimeString()} · ${usageData.elapsedTime}秒`;
          }
        }

        return fullText;
      } catch (e) {
        console.error('解析usage数据出错:', e, '原始数据:', eventData);
      }
    } else if (eventName === 'done') {
      window.parent.postMessage({ type: 'ai_tool_call_done' }, '*');
      UI.hideThinking(aiMessageDiv);
      UI.finalizeAIMessage(aiMessageDiv, false);
    } else if (eventData) {
      const payloads = parseSseDataPayload(eventData);
      if (!payloads) {
        const looksLikeToolProtocol =
          /"tool_call"/.test(eventData) && eventData.trim().startsWith('{');
        if (looksLikeToolProtocol) {
          console.warn('工具协议 data 行解析失败，已忽略以避免污染正文:', eventData.slice(0, 240));
          return fullText;
        }
        if (aiMessageDiv.querySelector('.ai-thinking')) {
          UI.hideThinking(aiMessageDiv);
        }
        const newFullText = fullText + eventData;
        UI.updateMainContent(aiMessageDiv, newFullText);
        return newFullText;
      }
      let nextText = fullText;
      for (let i = 0; i < payloads.length; i++) {
        nextText = applyStreamDataObject(payloads[i], aiMessageDiv, nextText);
      }
      return nextText;
    }

    return fullText;
  }

  /**
   * @param {Response} response
   * @param {HTMLElement} aiMessageDiv
   * @param {number} startTime
   */
  async function processStreamResponse(response, aiMessageDiv, startTime) {
    const app = getApp();
    const UI = getUI();
    const reader = response.body.getReader();
    currentReader = reader;
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let eventName = '';
    let eventData = '';
    let buffer = '';
    let readError = null;

    const chatMessages = app.elements.chatMessages;
    if (chatMessages) {
      chatMessages.querySelector('.quick-message-bubbles')?.remove();
      chatMessages.querySelector('.appended-quick-bubbles')?.remove();
    }

    try {
      while (true) {
        let done;
        let value;
        try {
          ({ done, value } = await reader.read());
        } catch (e) {
          if (!userAborted) {
            readError = e;
          }
          break;
        }

        if (done) {
          if (buffer.length > 0) {
            for (const line of `${buffer}\n`.split('\n')) {
              if (line.startsWith('event:')) {
                eventName = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                fullText = await handleEventData(
                  eventName,
                  line.substring(5).trim(),
                  aiMessageDiv,
                  fullText,
                  startTime,
                );
              } else if (!line.trim()) {
                eventName = '';
              }
            }
            buffer = '';
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        if (lines.length > 1) {
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.substring(5).trim();
              fullText = await handleEventData(
                eventName,
                eventData,
                aiMessageDiv,
                fullText,
                startTime,
              );
            } else if (!line.trim()) {
              eventName = '';
              eventData = '';
            }
          }
        }
      }
    } finally {
      if (readError) {
        console.error('读取流出错:', readError);
        UI.updateAIMessage(aiMessageDiv, `错误: ${readError.message || '读取响应流失败'}`);
      }
      UI.hideThinking(aiMessageDiv);
      UI.finalizeAIMessage(aiMessageDiv);

      if (userAborted) {
        const last = app.state.messageHistory[app.state.messageHistory.length - 1];
        if (last?.role === 'user') {
          app.state.messageHistory.pop();
        }
        compactConsumeMarker = null;
        autoCompactSummaryFromStream = null;
      } else if (fullText) {
        const turnEntries = turnCollector?.toHistoryEntries(fullText) ?? [
          { role: 'assistant', content: fullText },
        ];
        for (const entry of turnEntries) {
          app.state.messageHistory.push(entry);
        }
        if (shouldConsumeAfterSuccessfulSend()) {
          consumeContextCompression(app);
        }
        persistMessageHistory(app);
      }
      if (fullText || userAborted) {
        setTimeout(() => UI.showAppendedQuickMessages(), 300);
      }
    }
  }

  /**
   * @param {object} app
   * @param {string} message
   * @param {object[] | undefined} messages
   * @returns {Record<string, unknown>}
   */
  /**
   * @param {string} toolCallId
   * @param {'approve'|'deny'} decision
   * @param {boolean} alwaysAllowSession
   * @param {string} codeName
   */
  async function resolveToolPermission(
    toolCallId,
    decision,
    alwaysAllowSession,
    codeName,
    permissionSessionKey,
  ) {
    if (!requestId) {
      console.warn('[permission] 缺少 requestId，无法确认');
      return;
    }
    if (typeof permissionSessionKey !== 'string' || !permissionSessionKey.length) {
      console.warn('[permission] 缺少 permissionSessionKey，无法确认');
      return;
    }
    try {
      const res = await fetch('/api/chat/permission-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          toolCallId,
          decision,
          alwaysAllowSession,
          sessionKey: permissionSessionKey,
          codeName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[permission] resolve 失败', data);
      }
    } catch (err) {
      console.error('[permission] resolve 请求异常', err);
    }
  }

  function buildStreamRequestBody(app, message, model, temperature, maxTokens, enableMcpTools, messages) {
    const provider = app.elements.provider.value;
    const mcpServerIds = enableMcpTools ? app.getSelectableMcpServerIds() : undefined;
    const enabledSystemToolNames = Array.isArray(app.state.enabledSystemToolNames)
      ? [...app.state.enabledSystemToolNames]
      : [];
    // authed：messages[] 不上行，服务端按 contextOptions 裁剪组上下文
    const contextOptions = app.sessionStore?.isAuthed?.()
      ? { messageHistoryCount: app.state.messageHistoryCount }
      : undefined;

    return buildChatStreamRequestBody({
      message,
      messages,
      contextOptions,
      model,
      temperature,
      maxTokens,
      vendor: provider,
      enableTools: enableMcpTools,
      enablePrompts: app.state.enablePrompts,
      maxToolCallRounds: app.state.maxToolCallRounds,
      enableAutoCompact: app.state.enableAutoCompact,
      compactModel: app.state.compactModel || app.elements.compactModel?.value,
      mcpServerIds,
      enabledSystemToolNames,
      permissionMode: app.state.permissionMode || 'open',
      skipMemory: app.state.skipMemory === true,
      sessionId: app.state.sessionId,
    });
  }

  async function sendStreamRequest(message, model, temperature, maxTokens, enableTools = false) {
    const app = getApp();
    const UI = getUI();

    if (!app.state.isConfigLoaded) {
      UI.showTooltip('配置尚未加载完成，请稍后再试');
      return;
    }

    const provider = app.elements.provider.value;
    if (!app.state.providers[provider]) {
      UI.showTooltip('无效的供应商配置');
      return;
    }

    userAborted = false;
    requestId = null;
    turnCollector = new TurnCollector();

    const startTime = Date.now();

    // authed：首发懒建服务端会话（body 只带新消息，须先有 ChatSession.id）
    if (app.sessionStore?.isAuthed?.()) {
      try {
        await app.sessionStore.ensureActiveSession();
      } catch (error) {
        UI.showTooltip(`创建会话失败: ${error.message || '未知错误'}`);
        return;
      }
    }

    UI.addUserMessage(message);
    const aiMessageDiv = UI.addAIMessage();

    app.setStreamingState(true);

    try {
      beginCompactConsumeTracking(app);

      // authed：不上行历史 messages[]（服务端组上下文）；guest：本地组全量
      const outgoing = app.sessionStore?.isAuthed?.() ? [] : buildOutgoingMessages(app, message);
      const requestBody = buildStreamRequestBody(
        app,
        message,
        model,
        temperature,
        maxTokens,
        enableTools,
        outgoing.length > 0 ? outgoing : undefined,
      );

      app.state.messageHistory.push({
        role: 'user',
        content: message,
      });

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      await processStreamResponse(response, aiMessageDiv, startTime);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('发送请求出错:', error);
        UI.updateAIMessage(aiMessageDiv, `错误: ${error.message || '与服务器通信失败'}`);
        UI.finalizeAIMessage(aiMessageDiv);
      }
    } finally {
      app.setStreamingState(false);
      currentReader = null;
    }
  }

  async function sendRegularRequest(message, model, temperature, maxTokens, enableTools = false) {
    const app = getApp();
    const UI = getUI();
    const R = app.renderers;

    if (!app.state.isConfigLoaded) {
      UI.showTooltip('配置尚未加载完成，请稍后再试');
      return;
    }

    const provider = app.elements.provider.value;
    if (!app.state.providers[provider]) {
      UI.showTooltip('无效的供应商配置');
      return;
    }

    if (app.sessionStore?.isAuthed?.()) {
      try {
        await app.sessionStore.ensureActiveSession();
      } catch (error) {
        UI.showTooltip(`创建会话失败: ${error.message || '未知错误'}`);
        return;
      }
    }

    const startTime = Date.now();
    const { responseContent, tokenUsage } = app.elements;
    responseContent.textContent = '';
    tokenUsage.innerHTML = '';
    app.elements.result.classList.remove('hidden');
    responseContent.innerHTML =
      '<div class="ai-thinking"><div class="thinking-spinner"></div>AI正在思考中...</div>';

    try {
      const outgoing = app.sessionStore?.isAuthed?.() ? [] : buildOutgoingMessages(app, message);
      const requestBody = buildStreamRequestBody(
        app,
        message,
        model,
        temperature,
        maxTokens,
        enableTools,
        outgoing.length > 0 ? outgoing : undefined,
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      app.elements.result.classList.remove('hidden');
      let content = '';
      let toolCallsHtml = '';

      if (data.tool_calls && data.tool_calls.length > 0) {
        for (const toolCall of data.tool_calls) {
          const source =
            R?.resolveToolSource?.({
              source: toolCall.meta?.source,
              name: toolCall.name,
            }) ?? 'mcp';
          const sourceClass = source === 'system' ? 'tool-call--system' : 'tool-call--mcp';
          const titleHtml = R?.buildToolCallTitleHtml
            ? R.buildToolCallTitleHtml(toolCall.name, source)
            : `<code class="tool-call-name">${toolCall.name}</code>`;
          const argsStr = JSON.stringify(toolCall.arguments, null, 2);
          const resultStr = JSON.stringify(toolCall.result, null, 2);

          toolCallsHtml += `
                        <div class="tool-call collapsed ${sourceClass}" data-tool-source="${source}">
                            <div class="tool-call-header">
                                <div class="tool-call-title">${titleHtml}</div>
                            </div>
                            <div class="tool-call-content">
                                <div class="tool-call-args">${argsStr}</div>
                                <div class="tool-call-result">
                                    <strong>结果:</strong><pre>${resultStr}</pre>
                                </div>
                            </div>
                        </div>
                    `;
        }

        content = data.content || '';
      } else {
        content = data.content || (data.result && data.result.content) || '';
      }

      responseContent.innerHTML = `
                ${toolCallsHtml}
                <div class="markdown-content">${UI.parseMarkdown(content)}</div>
            `;

      UI.processCodeBlocks(responseContent);
      UI.showResponseTime(elapsedTime);
      UI.showTokenUsage(data.usage || (data.result && data.result.usage));

      if (content) {
        app.state.messageHistory.push({
          role: 'user',
          content: message,
        });

        const assistant = {
          role: 'assistant',
          content,
          turnId: crypto.randomUUID(),
        };

        if (data.tool_calls?.length > 0) {
          const storedToolCalls = data.tool_calls.map((tc, i) => ({
            id: tc.id ?? `tc-${Date.now()}-${i}`,
            name: tc.name,
            source: tc.meta?.source ?? R?.resolveToolSource?.(tc.name) ?? 'mcp',
            args: tc.arguments ?? {},
            result: tc.result,
            isError: false,
            executionTime: undefined,
            tokenUsage: undefined,
            progressSteps: [],
          }));
          assistant.tool_calls = buildToolCallsFromStored(storedToolCalls);
          assistant.toolCalls = storedToolCalls;
          assistant._toolResultsExpanded = true;
          app.state.messageHistory.push(assistant);

          for (const tc of storedToolCalls) {
            if (tc.result === null || tc.result === undefined) {
              continue;
            }
            app.state.messageHistory.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: stringifyToolContent(tc.result),
            });
          }
        } else {
          app.state.messageHistory.push(assistant);
        }

        persistMessageHistory(app);
      }
    } catch (error) {
      console.error('发送请求出错:', error);
      app.elements.result.classList.remove('hidden');
      responseContent.textContent = `错误: ${error.message || '与服务器通信失败'}`;
    }
  }

  async function getAvailableMCPTools() {
    try {
      const response = await fetch('/api/tools/list');

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('获取MCP工具列表失败:', data.error);
        return [];
      }

      return data.tools || [];
    } catch (error) {
      console.error('获取MCP工具出错:', error);
      return [];
    }
  }

  async function getMCPServers() {
    try {
      const response = await fetch('/api/mcp/servers?scope=configured');

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('获取MCP服务器列表失败:', data.error);
        return { servers: [] };
      }

      return data;
    } catch (error) {
      console.error('获取MCP服务器出错:', error);
      return { servers: [] };
    }
  }

  async function probeMcpServers(serverIds) {
    const response = await fetch('/api/mcp/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverIds }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP错误: ${response.status}`);
    }
    return data;
  }

  function buildOutgoingMessages(app, newUserContent) {
    return buildApiContextMessages(app, newUserContent);
  }

  /**
   * authed 模式下 context-preview / compact 的服务端取数字段（sessionId + 裁剪参数）；
   * guest 返回空对象（服务端据无 user 回退 body messages[]）。
   * @param {object} app
   * @returns {Record<string, unknown>}
   */
  function authedContextFields(app) {
    if (!app.sessionStore?.isAuthed?.()) {
      return {};
    }
    return {
      sessionId: app.state.sessionId,
      contextOptions: { messageHistoryCount: app.state.messageHistoryCount },
    };
  }

  function buildBaseContextMessages(app) {
    return buildApiContextMessages(app, null);
  }

  async function refreshContextPanelPreview(options = {}) {
    const app = getApp();
    const UI = getUI();
    const { showLoading = true, loadingText = '正在刷新…' } = options;

    const messages = buildBaseContextMessages(app);
    if (messages.length === 0) {
      return;
    }

    if (showLoading) {
      const statusEl = document.getElementById('context-status');
      const dashboardEl = document.getElementById('context-dashboard');
      const listEl = document.getElementById('context-messages-list');
      const footerEl = document.getElementById('context-modal-footer');
      if (statusEl) {
        statusEl.className = 'context-status context-status-loading';
        statusEl.textContent = loadingText;
        statusEl.classList.remove('hidden');
      }
      if (dashboardEl) {
        dashboardEl.classList.add('hidden');
      }
      if (listEl) {
        listEl.innerHTML = '<p class="context-empty">正在加载…</p>';
      }
      if (footerEl) {
        footerEl.classList.remove('hidden');
        UI.updateContextCompactControls?.(UI.isContextCompacted?.() ?? false);
      }
    }

    try {
      const vendor = app.elements.provider.value;
      const response = await fetch('/api/chat/context-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // authed：不上行本地全量历史，服务端按 sessionId 组上下文（T4-04-03）
          messages: app.sessionStore?.isAuthed?.() ? [] : messages,
          vendor,
          enableAutoCompact: app.state.enableAutoCompact,
          contextOverride: app.state.apiContextOverride?.length
            ? app.state.apiContextOverride
            : null,
          ...authedContextFields(app),
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        if (response.status === 413) {
          throw new Error('上下文过大，无法加载预览。您仍可尝试生成摘要。');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(data.error || '上下文过大，无法加载预览。您仍可尝试生成摘要。');
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      app.state._lastContextPreview = data.preview;
      UI.renderContextPreview(data.preview, {
        hasOverride: !!app.state.apiContextOverride?.length,
        hasDraft: !!app.state.compactDraft,
      });
      if (UI.syncContextDraftPreview) {
        UI.syncContextDraftPreview();
      }
    } catch (error) {
      console.error('上下文预览失败:', error);
      UI.renderContextPreviewError?.(error);
      UI.showTooltip(`预览失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async function openContextPanel() {
    const app = getApp();
    const UI = getUI();

    if (!app.state.isConfigLoaded) {
      UI.showTooltip('配置尚未加载完成');
      return;
    }

    const messages = buildBaseContextMessages(app);
    if (messages.length === 0) {
      UI.showTooltip('当前没有可预览的历史消息');
      return;
    }

    UI.showContextModal();
    UI.updateContextCompactControls?.(UI.isContextCompacted?.() ?? false);
    UI.syncContextDraftPreview?.();
    await refreshContextPanelPreview({
      showLoading: true,
      loadingText: '正在计算上下文…',
    });
  }

  async function generateCompactDraft() {
    const app = getApp();
    const UI = getUI();
    const genBtn = document.getElementById('context-generate-summary');

    const messages = buildBaseContextMessages(app);
    if (messages.length === 0) {
      UI.showTooltip('没有可压缩的消息');
      return;
    }

    const vendor = app.elements.provider.value;
    const compactModel = app.state.compactModel || app.elements.compactModel?.value;
    if (!compactModel) {
      UI.showTooltip('请先在设置中选择压缩模型');
      return;
    }

    if (genBtn) {
      genBtn.disabled = true;
    }
    UI.setContextCompactGenerating?.(true);

    try {
      const response = await fetch('/api/chat/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: app.sessionStore?.isAuthed?.() ? [] : messages,
          vendor,
          compactModel,
          ...authedContextFields(app),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const summaryMsg = data.messages?.[0];
      const content = typeof summaryMsg?.content === 'string' ? summaryMsg.content : '';
      if (!content) {
        throw new Error('摘要为空');
      }

      app.state.compactDraft = summaryMsg;
      UI.setCompactDraft(content);
      UI.refreshCompactSectionUi?.();
      const sec =
        typeof data.elapsedMs === 'number' ? `（${(data.elapsedMs / 1000).toFixed(1)}s）` : '';
      UI.showTooltip(`摘要已生成${sec}，请确认后点击「应用摘要」`);
    } catch (error) {
      console.error('生成摘要失败:', error);
      UI.showTooltip(`生成失败: ${error.message || '未知错误'}`);
    } finally {
      UI.setContextCompactGenerating?.(false);
      UI.updateContextCompactControls?.(UI.isContextCompacted?.() ?? false);
    }
  }

  async function applyCompactOverride() {
    const app = getApp();
    const UI = getUI();

    if (!app.state.compactDraft) {
      UI.showTooltip('请先生成摘要');
      return;
    }

    app.state.compactedBaseline = null;
    saveCompactedBaselineToStorage(app);
    app.state.apiContextOverride = [app.state.compactDraft];
    UI.addContextNotice();

    const applyBtn = document.getElementById('context-apply-summary');
    if (applyBtn) {
      applyBtn.disabled = true;
    }

    await refreshContextPanelPreview({ showLoading: true });
    UI.showTooltip(UI.CONTEXT_COMPACTED_LABEL);
  }

  function resetContextCompressionState(options = {}) {
    const app = getApp();
    const UI = getUI();
    const { showTooltip = false, clearBaseline = true } = options;

    app.state.apiContextOverride = null;
    app.state.compactDraft = null;
    app.state._lastContextPreview = null;
    app.state.contextCompactedActive = false;
    compactConsumeMarker = null;
    autoCompactSummaryFromStream = null;

    if (clearBaseline) {
      app.state.compactedBaseline = null;
      saveCompactedBaselineToStorage(app);
    }

    if (UI?.updateContextCompactControls) {
      UI.updateContextCompactControls(false);
    }
    if (UI?.syncContextDraftPreview) {
      UI.syncContextDraftPreview();
    } else if (UI?.setCompactDraft) {
      UI.setCompactDraft('');
    }
    UI?.refreshCompactSectionUi?.();
    const notice = app.elements?.chatMessages?.querySelector('.chat-context-notice');
    if (notice) {
      notice.remove();
    }

    if (showTooltip) {
      UI.showTooltip('已清除上下文覆盖');
    }
  }

  async function clearContextOverride() {
    resetContextCompressionState({ showTooltip: true });

    const modal = document.getElementById('context-modal');
    const modalOpen =
      modal &&
      !modal.classList.contains('hidden') &&
      modal.getAttribute('aria-hidden') !== 'true';

    if (modalOpen) {
      await refreshContextPanelPreview({ showLoading: true });
    }
  }

  return {
    toolCallArgumentsMap,
    saveCompactedBaselineToStorage,
    loadCompactedBaselineFromStorage,
    buildApiContextMessages,
    beginCompactConsumeTracking,
    consumeContextCompression,
    shouldConsumeAfterSuccessfulSend,
    abortCurrentStream,
    parseSseDataPayload,
    applyStreamDataObject,
    sendStreamRequest,
    sendRegularRequest,
    processStreamResponse,
    handleEventData,
    getAvailableMCPTools,
    getMCPServers,
    probeMcpServers,
    buildOutgoingMessages,
    buildBaseContextMessages,
    refreshContextPanelPreview,
    openContextPanel,
    generateCompactDraft,
    applyCompactOverride,
    resetContextCompressionState,
    clearContextOverride,
  };
}
