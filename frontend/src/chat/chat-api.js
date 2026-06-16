/**
 * AI 聊天 API：流式 SSE、上下文压缩、MCP 元数据
 */

import { buildChatStreamRequestBody } from './chat-request-body.js';
import {
  persistMessageHistory,
  saveCompactedBaselineToStorage,
} from './compact-baseline-storage.js';
import {
  authedContextFields,
  buildBaseContextMessages,
  buildOutgoingMessages,
} from './context-messages.js';
import { createStreamHandler } from './stream-handler.js';
import { buildToolCallsFromStored, stringifyToolContent } from './message-history-builder.js';

/**
 * @typedef {object} ChatApiDeps
 * @property {() => object} getApp
 * @property {() => object} getUI
 * @property {import('./turn-collector.js').TurnCollector} TurnCollector
 */

/**
 * @param {ChatApiDeps} deps
 * @returns {object}
 */
export function createChatApi(deps) {
  const { getApp, getUI, TurnCollector } = deps;

  /** @type {import('./stream-handler.js').StreamRuntime} */
  const streamRuntime = {
    turnCollector: null,
    currentReader: null,
    userAborted: false,
    requestId: null,
    autoCompactSummaryFromStream: null,
    toolCallArgumentsMap: new Map(),
  };

  /** @type {object | null} */
  let compactConsumeMarker = null;

  function beginCompactConsumeTracking(app) {
    const hadOverride = !!app.state.apiContextOverride?.length;
    const overrideContent = hadOverride && app.state.apiContextOverride[0]?.content;
    compactConsumeMarker = {
      userMessageIndex: app.state.messageHistory.length,
      hadOverride,
      summaryContent: typeof overrideContent === 'string' ? overrideContent : null,
    };
    streamRuntime.autoCompactSummaryFromStream = null;
  }

  function consumeContextCompression(app) {
    const UI = getUI();
    const marker = compactConsumeMarker;
    const autoSummary = streamRuntime.autoCompactSummaryFromStream;

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
    streamRuntime.autoCompactSummaryFromStream = null;

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
    if (streamRuntime.userAborted) {
      return false;
    }
    if (compactConsumeMarker?.hadOverride && compactConsumeMarker.summaryContent) {
      return true;
    }
    return !!(streamRuntime.autoCompactSummaryFromStream && compactConsumeMarker);
  }

  function abortCurrentStream() {
    const app = getApp();
    if (streamRuntime.currentReader) {
      streamRuntime.userAborted = true;
      streamRuntime.currentReader.cancel().catch(() => {});
      streamRuntime.currentReader = null;
    }
    app.setStreamingState(false);
    app.elements.sendButton.disabled = false;
  }

  const { processStreamResponse } = createStreamHandler({
    getApp,
    getUI,
    runtime: streamRuntime,
    consumeContextCompression,
    shouldConsumeAfterSuccessfulSend,
    persistMessageHistory,
    onStreamAborted: () => {
      compactConsumeMarker = null;
      streamRuntime.autoCompactSummaryFromStream = null;
    },
  });

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

    streamRuntime.userAborted = false;
    streamRuntime.requestId = null;
    streamRuntime.turnCollector = new TurnCollector();

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
      streamRuntime.currentReader = null;
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
      const response = await fetch('/api/mcp/servers?scope=pool-enabled');

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
    streamRuntime.autoCompactSummaryFromStream = null;

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
    abortCurrentStream,
    sendStreamRequest,
    sendRegularRequest,
    getAvailableMCPTools,
    getMCPServers,
    probeMcpServers,
    refreshContextPanelPreview,
    openContextPanel,
    generateCompactDraft,
    applyCompactOverride,
    resetContextCompressionState,
    clearContextOverride,
  };
}
