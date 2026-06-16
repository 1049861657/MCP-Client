/**
 * SSE 流式响应解析与 UI 更新（从 chat-api.js 拆出）
 */

import { parseSseDataPayload, resolveToolCallElement } from './sse-parse.js';
import { applyFinalUsageToMessage, applyStepUsageToMessage } from './usage-telemetry.js';

/**
 * @typedef {object} StreamRuntime
 * @property {import('./turn-collector.js').TurnCollector | null} turnCollector
 * @property {ReadableStreamDefaultReader<Uint8Array> | null} currentReader
 * @property {boolean} userAborted
 * @property {string | null} requestId
 * @property {string | null} autoCompactSummaryFromStream
 * @property {Map<string, { arguments: string }>} toolCallArgumentsMap
 */

/**
 * @typedef {object} StreamHandlerDeps
 * @property {() => object} getApp
 * @property {() => object} getUI
 * @property {StreamRuntime} runtime
 * @property {(app: object) => void} consumeContextCompression
 * @property {() => boolean} shouldConsumeAfterSuccessfulSend
 * @property {(app: object) => void} persistMessageHistory
 * @property {() => void} onStreamAborted
 */

/**
 * @param {StreamHandlerDeps} deps
 */
export function createStreamHandler(deps) {
  const { getApp, getUI, runtime, consumeContextCompression, shouldConsumeAfterSuccessfulSend, persistMessageHistory, onStreamAborted } =
    deps;

  /**
   * @param {string} toolCallId
   * @param {'approve'|'deny'} decision
   * @param {boolean} alwaysAllowSession
   * @param {string} codeName
   * @param {string} permissionSessionKey
   */
  async function resolveToolPermission(
    toolCallId,
    decision,
    alwaysAllowSession,
    codeName,
    permissionSessionKey,
  ) {
    if (!runtime.requestId) {
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
          requestId: runtime.requestId,
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

  /**
   * @param {object} jsonData
   * @param {HTMLElement} aiMessageDiv
   * @param {string} fullText
   * @returns {string}
   */
  function applyStreamDataObject(jsonData, aiMessageDiv, fullText) {
    const UI = getUI();
    const { turnCollector, toolCallArgumentsMap } = runtime;

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
            runtime.requestId = beginData.requestId;
            console.debug('[SSE] requestId:', runtime.requestId);
          }
        } catch (e) {
          console.warn('解析 begin 事件失败:', e);
        }
      }
      window.parent.postMessage({ type: 'ai_tool_call_begin', requestId: runtime.requestId }, '*');
    } else if (eventName === 'context_compacted') {
      if (eventData) {
        try {
          const compactData = JSON.parse(eventData);
          if (typeof compactData.summaryContent === 'string' && compactData.summaryContent.length > 0) {
            runtime.autoCompactSummaryFromStream = compactData.summaryContent;
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
          const timeInfo =
            aiMessageDiv.querySelector('.ai-message-meta.message-time') ??
            aiMessageDiv.querySelector('.message-time');
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
    runtime.currentReader = reader;
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
          if (!runtime.userAborted) {
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

      if (runtime.userAborted) {
        const last = app.state.messageHistory[app.state.messageHistory.length - 1];
        if (last?.role === 'user') {
          app.state.messageHistory.pop();
        }
        onStreamAborted();
      } else if (fullText) {
        const turnEntries = runtime.turnCollector?.toHistoryEntries(fullText) ?? [
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
      if (fullText || runtime.userAborted) {
        setTimeout(() => UI.showAppendedQuickMessages(), 300);
      }
    }
  }

  return {
    applyStreamDataObject,
    handleEventData,
    processStreamResponse,
  };
}
