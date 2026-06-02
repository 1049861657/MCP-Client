/**
 * 注入 Chat 页模态 DOM（04-07～11）；须在 createChatApp().init() 之前调用
 */
export function mountChatModals() {
  if (document.getElementById('chat-modals-root')) {
    return;
  }

  const root = document.createElement('div');
  root.id = 'chat-modals-root';
  root.innerHTML = MODALS_HTML;
  document.body.appendChild(root);
}

const MODALS_HTML = `
<div id="history-modal" class="chat-modal history-modal hidden" aria-hidden="true">
  <div class="chat-modal-panel history-modal-panel">
    <div class="history-modal-header">
      <div class="history-modal-title-wrap">
        <span class="history-modal-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"/></svg>
        </span>
        <div class="history-modal-head-text">
          <h2 class="history-modal-title">聊天历史</h2>
          <p class="history-modal-subtitle">查看和管理您的会话记录</p>
        </div>
      </div>
      <button type="button" class="history-modal-close" data-close-modal="history-modal" aria-label="关闭">&times;</button>
    </div>
    <div class="history-modal-body">
      <aside class="history-sidebar">
        <div class="history-sidebar-head">
          <p id="session-list-title" class="history-sidebar-label">会话列表</p>
          <div class="history-sidebar-tools">
            <button type="button" id="history-select-all" class="history-link-btn">全选</button>
            <button type="button" id="history-deselect-all" class="history-link-btn">取消</button>
            <button type="button" id="history-batch-delete" class="history-link-btn history-link-btn--danger" disabled>删除</button>
          </div>
        </div>
        <div class="history-search-wrap">
          <span class="history-search-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"/></svg>
          </span>
          <input type="search" id="session-search" class="history-search-input" placeholder="搜索会话…" autocomplete="off">
        </div>
        <div id="sessions-container" class="history-sessions">
          <p class="history-empty">正在加载…</p>
        </div>
      </aside>
      <section class="history-detail">
        <div class="history-detail-head">
          <div class="history-detail-head-text">
            <h3 id="session-detail-title" class="history-detail-title">会话详情</h3>
            <p id="session-detail-meta" class="history-detail-meta">请从左侧选择会话</p>
          </div>
          <div class="history-detail-actions">
            <button type="button" id="load-session" class="history-action-btn history-action-btn--load" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
              加载会话
            </button>
            <button type="button" id="delete-session" class="history-action-btn history-action-btn--delete" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>
              删除会话
            </button>
          </div>
        </div>
        <div id="session-messages" class="history-messages">
          <p class="history-empty history-empty--detail">请从左侧选择会话</p>
        </div>
      </section>
    </div>
  </div>
</div>

<div id="settings-modal" class="chat-modal settings-modal hidden" aria-hidden="true">
  <div class="settings-modal-panel">
    <header class="settings-modal-header">
      <div class="settings-header-left">
        <span class="settings-modal-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.63-.94l-.36-2.54A.484.484 0 0 0 14.7 2h-3.4c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.63.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.71 1.63.94l.36 2.54c.05.24.24.41.47.41h3.4c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>
        </span>
        <div>
          <h2 id="settings-title" class="settings-modal-title">聊天设置</h2>
          <p class="settings-modal-subtitle">配置模型、记忆与工具行为</p>
        </div>
      </div>
      <div class="settings-header-right">
        <span class="settings-model-pill" id="settings-model-pill">—</span>
        <button type="button" class="settings-modal-close" data-close-modal="settings-modal" aria-label="关闭">&times;</button>
      </div>
    </header>

    <div class="settings-modal-body">
      <nav class="settings-nav" role="tablist" aria-label="设置分类">
        <button type="button" class="settings-nav-item active" data-settings-tab="model" role="tab" aria-selected="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H8V4h12z"/></svg>
          对话模型
        </button>
        <button type="button" class="settings-nav-item" data-settings-tab="memory" role="tab" aria-selected="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9H13z"/></svg>
          记忆
        </button>
        <button type="button" class="settings-nav-item" data-settings-tab="tools" role="tab" aria-selected="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.7 19-11.1-11.3c.75-.73 1.1-1.7 1.1-2.8 0-2.2-1.8-4-4-4-1.1 0-2 .35-2.8 1.1L7.8 1.3C6.8.5 5.6 0 4.2 0 1.9 0 0 1.9 0 4.2c0 1.4.5 2.6 1.3 3.6L12.6 19c.9.9 2.1 1.4 3.4 1.4 1.3 0 2.5-.5 3.4-1.4l3.3-3.3c.9-.9 1.4-2.1 1.4-3.4 0-1.3-.5-2.5-1.4-3.4M4.2 2c1.2 0 2.2 1 2.2 2.2 0 1.2-1 2.2-2.2 2.2-1.2 0-2.2-1-2.2-2.2 0-1.2 1-2.2 2.2-2.2m15.6 15.6c-.6.6-1.4.9-2.2.9-.8 0-1.6-.3-2.2-.9L4.2 6.4c-.6-.6-.9-1.4-.9-2.2 0-.8.3-1.6.9-2.2l3.3-3.3c.6-.6 1.4-.9 2.2-.9.8 0 1.6.3 2.2.9L20 15.4c.6.6.9 1.4.9 2.2 0 .8-.3 1.6-.9 2.2"/></svg>
          工具
        </button>
        <button type="button" class="settings-nav-item" data-settings-tab="style" role="tab" aria-selected="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
          生成
        </button>
      </nav>

      <div class="settings-content">
        <div class="settings-panel active" id="settings-panel-model" role="tabpanel">
          <div class="settings-card">
            <div class="settings-card-head">
              <h3 class="settings-card-title">主模型</h3>
              <p class="settings-card-desc">决定 AI 回复使用的推理模型。</p>
            </div>
            <div class="settings-card-body settings-card-body--gap">
              <div class="settings-field-grid">
                <div class="settings-field-row">
                  <span class="settings-field-label">供应商</span>
                  <select id="provider" class="settings-select"></select>
                </div>
                <div class="settings-field-row">
                  <span class="settings-field-label">模型</span>
                  <select id="model" class="settings-select"></select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-panel" id="settings-panel-memory" role="tabpanel" hidden>
          <div class="settings-card">
            <div class="settings-card-head">
              <h3 class="settings-card-title">对话记忆</h3>
              <p class="settings-card-desc">控制请求中携带的历史消息范围。</p>
            </div>
            <div class="settings-card-body">
              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">启用历史消息</div>
                  <div class="settings-item-hint">关闭后每次仅发送当前输入</div>
                </div>
                <button type="button" class="settings-toggle on" id="settings-toggle-history" aria-pressed="true" aria-controls="settings-history-nested"></button>
              </div>
              <div id="settings-history-nested" class="settings-nested">
                <div class="settings-inline-field">
                  <span class="settings-field-label">保留最近条数</span>
                  <div class="settings-stepper">
                    <button type="button" class="settings-stepper-btn" id="settings-hist-minus" aria-label="减少">−</button>
                    <span id="settings-hist-val">20</span>
                    <button type="button" class="settings-stepper-btn" id="settings-hist-plus" aria-label="增加">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-head">
              <h3 class="settings-card-title">上下文压缩</h3>
              <p class="settings-card-desc">上下文过长时自动调用压缩模型生成摘要。</p>
            </div>
            <div class="settings-card-body">
              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">发送前自动摘要</div>
                  <div class="settings-item-hint">超过阈值时在后台压缩历史</div>
                </div>
                <button type="button" class="settings-toggle" id="settings-toggle-compact" aria-pressed="false" aria-controls="settings-compact-nested"></button>
              </div>
              <div id="settings-compact-nested" class="settings-nested hidden">
                <div class="settings-field-row">
                  <span class="settings-field-label">压缩模型</span>
                  <select id="compact-model" class="settings-select"></select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-panel" id="settings-panel-tools" role="tabpanel" hidden>
          <div class="settings-card">
            <div class="settings-card-head">
              <h3 class="settings-card-title">工具与 Agent</h3>
              <p class="settings-card-desc">MCP 调用与 Agent 辅助能力。</p>
            </div>
            <div class="settings-card-body">
              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">启用 MCP 工具</div>
                  <div class="settings-item-hint">允许 AI 调用 MCP 服务器工具</div>
                </div>
                <button type="button" class="settings-toggle on" id="settings-toggle-mcp" aria-pressed="true"></button>
              </div>

              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">工具调用轮次上限</div>
                  <div class="settings-item-hint">防止无限 tool loop（1–100）</div>
                </div>
                <div class="settings-stepper">
                  <button type="button" class="settings-stepper-btn" id="settings-tool-minus" aria-label="减少">−</button>
                  <span id="settings-tool-val">25</span>
                  <button type="button" class="settings-stepper-btn" id="settings-tool-plus" aria-label="增加">+</button>
                </div>
              </div>

              <div class="settings-field-row settings-field-row--permission">
                <span class="settings-field-label">工具执行方式</span>
                <div class="settings-segmented" id="settings-permission-mode">
                  <button type="button" class="settings-seg-btn active" data-permission-mode="open">自动</button>
                  <button type="button" class="settings-seg-btn" data-permission-mode="interactive">确认</button>
                  <button type="button" class="settings-seg-btn" data-permission-mode="locked">只读</button>
                </div>
                <p class="settings-permission-footnote" id="settings-permission-footnote" role="status"></p>
              </div>

              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">参数校验</div>
                  <div class="settings-item-hint">调用前校验 MCP 参数 schema · 开发中，暂不允许开启</div>
                </div>
                <button type="button" class="settings-toggle" id="settings-toggle-param-validation" aria-pressed="false" disabled title="开发中，暂不允许开启"></button>
              </div>

              <div class="settings-item">
                <div class="settings-item-text">
                  <div class="settings-item-title">系统提示词</div>
                  <div class="settings-item-hint">注入 Agent 系统级指令</div>
                </div>
                <button type="button" class="settings-toggle on" id="settings-toggle-prompts" aria-pressed="true"></button>
              </div>

              <div class="settings-link-item">
                <button type="button" id="edit-prompts" class="settings-text-link">编辑提示词 →</button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-panel" id="settings-panel-style" role="tabpanel" hidden>
          <div class="settings-card">
            <div class="settings-card-head">
              <h3 class="settings-card-title">生成参数</h3>
              <p class="settings-card-desc">控制回复风格、长度与输出方式。</p>
            </div>
            <div class="settings-card-body settings-card-body--gap">
              <div class="settings-slider-block">
                <div class="settings-slider-meta">
                  <span class="settings-field-label">温度</span>
                  <span class="settings-slider-value" id="settings-temp-val">0.7</span>
                </div>
                <input type="range" id="settings-temp-slider" min="0" max="10" step="1" value="7">
                <div class="settings-chips" id="settings-temp-chips">
                  <button type="button" class="settings-chip" data-temp="0.2">精确 0.2</button>
                  <button type="button" class="settings-chip active" data-temp="0.7">平衡 0.7</button>
                  <button type="button" class="settings-chip" data-temp="1.0">创意 1.0</button>
                </div>
              </div>

              <div class="settings-tokens-block">
                <div class="settings-slider-meta">
                  <span class="settings-field-label">最大生成长度</span>
                  <span class="settings-slider-value" id="settings-tokens-val">2048<span class="settings-value-unit"> tokens</span></span>
                </div>
                <input type="range" id="settings-tokens-slider" min="512" max="8192" step="512" value="2048">
                <div class="settings-tokens-hints">
                  <span>512</span>
                  <span>8192</span>
                </div>
                <div class="settings-chips" id="settings-tokens-chips">
                  <button type="button" class="settings-chip" data-tokens="1024">1K</button>
                  <button type="button" class="settings-chip active" data-tokens="2048">2K</button>
                  <button type="button" class="settings-chip" data-tokens="4096">4K</button>
                  <button type="button" class="settings-chip" data-tokens="8192">8K</button>
                </div>
              </div>

              <div class="settings-field-row settings-field-row--divider">
                <span class="settings-field-label">响应方式</span>
                <div class="settings-segmented" id="settings-response-mode">
                  <button type="button" class="settings-seg-btn active" data-mode="stream">流式输出</button>
                  <button type="button" class="settings-seg-btn is-disabled" disabled title="暂未维护">一次性返回</button>
                </div>
                <p class="settings-item-hint settings-item-hint--flush">默认流式；非流式暂未开放。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="settings-modal-footer">
      <button type="button" id="reset-settings" class="settings-btn-ghost">恢复默认</button>
      <span class="settings-footer-note">更改在关闭时自动保存</span>
    </footer>

    <input type="checkbox" id="enable-message-history" class="hidden" checked>
    <input type="checkbox" id="enable-auto-compact" class="hidden">
    <input type="checkbox" id="enable-mcp-tools" class="hidden" checked>
    <input type="checkbox" id="enable-param-validation" class="hidden">
    <input type="checkbox" id="enable-prompts" class="hidden" checked>
    <input type="number" id="message-history-count" class="hidden" value="20" min="1" max="50">
    <input type="number" id="max-tool-call-rounds" class="hidden" value="25" min="1" max="100">
    <input type="number" id="temperature" class="hidden" value="0.7" min="0" max="1" step="0.1">
    <input type="number" id="max-tokens" class="hidden" value="2048" min="512" max="8192">
    <input type="radio" id="mode-stream" name="chat-mode" checked class="hidden">
    <input type="radio" id="mode-regular" name="chat-mode" class="hidden">
  </div>
</div>

<div id="context-modal" class="chat-modal context-modal hidden" aria-hidden="true">
  <div class="chat-modal-panel context-modal-panel">
    <div class="context-modal-header">
      <div class="context-modal-title-wrap">
        <span class="context-modal-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        </span>
        <div class="context-modal-head-text">
          <h2 class="context-modal-title">请求上下文</h2>
          <p class="context-modal-subtitle">查看即将发送给模型的消息与 token 占用</p>
        </div>
      </div>
      <button type="button" class="context-modal-close" data-close-modal="context-modal" aria-label="关闭">&times;</button>
    </div>
    <div class="context-modal-body">
      <div id="context-status" class="context-status hidden"></div>
      <div id="context-dashboard" class="context-dashboard hidden">
        <div class="context-dashboard-top">
          <div class="context-token-main">
            <span id="context-token-value" class="context-token-value">—</span>
            <span id="context-token-limit" class="context-token-limit">/ — tokens</span>
            <span id="context-token-pct" class="context-token-pct"></span>
          </div>
          <span id="context-state-chip" class="context-state-chip hidden"></span>
        </div>
        <div class="context-token-bar" aria-hidden="true">
          <div id="context-token-bar-fill" class="context-token-bar-fill"></div>
        </div>
        <div id="context-role-breakdown" class="context-payload-composition"></div>
      </div>
      <div class="context-scroll-stack">
      <section id="context-messages-panel" class="context-messages-panel">
        <div class="context-messages-head">
          <h3 class="context-section-label">消息载荷</h3>
          <span id="context-msg-count" class="context-section-count"></span>
        </div>
        <div id="context-messages-list" class="context-messages-list">
          <p class="context-empty">正在加载…</p>
        </div>
      </section>
      <section id="context-compact-section" class="context-compact-section hidden">
        <div class="context-compact-head">
          <h3 class="context-section-label">摘要与压缩</h3>
          <span id="context-compact-badge" class="context-compact-badge hidden"></span>
        </div>
        <div id="context-compact-draft-wrap" class="context-compact-draft-wrap hidden" hidden>
          <div id="context-draft-label" class="context-draft-label"></div>
          <div id="context-compact-draft" class="context-compact-draft markdown-content"></div>
        </div>
      </section>
      </div>
    </div>
    <div id="context-modal-footer" class="context-modal-footer">
      <button type="button" id="context-clear-override" class="context-footer-btn context-footer-btn--ghost">恢复完整历史</button>
      <div class="context-modal-footer-primary">
        <button type="button" id="context-generate-summary" class="context-footer-btn context-footer-btn--secondary">生成摘要</button>
        <button type="button" id="context-apply-summary" class="context-footer-btn context-footer-btn--primary" disabled>应用摘要</button>
      </div>
    </div>
  </div>
</div>

<div id="mcp-servers-modal" class="chat-modal mcp-modal hidden" aria-hidden="true">
  <div class="chat-modal-panel mcp-modal-panel">
    <div class="chat-modal-header mcp-modal-header">
      <div class="mcp-modal-title-wrap">
        <span class="mcp-modal-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2m0 2v3h-1V4zm-5 8a2 2 0 0 0-2 2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0-2-2m10 0a2 2 0 0 0-2 2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0-2-2"/></svg>
        </span>
        <h2 class="chat-modal-title mcp-modal-title">MCP 服务器</h2>
      </div>
      <button type="button" class="chat-modal-close mcp-modal-close" data-close-modal="mcp-servers-modal" aria-label="关闭">&times;</button>
    </div>
    <div class="chat-modal-body mcp-modal-body">
      <div class="mcp-modal-actions">
        <div class="mcp-action-group">
          <button type="button" id="mcp-select-all" class="mcp-action-chip mcp-action-chip--select">全选</button>
          <span class="mcp-action-divider" aria-hidden="true"></span>
          <button type="button" id="mcp-deselect-all" class="mcp-action-chip mcp-action-chip--clear">取消全选</button>
        </div>
      </div>
      <div id="mcp-modal-servers-list" class="mcp-server-list">
        <p class="mcp-servers-empty">加载中…</p>
      </div>
      <div class="chat-modal-footer mcp-modal-footer">
        <button type="button" id="mcp-cancel" class="mcp-footer-btn mcp-footer-btn--ghost">取消</button>
        <button type="button" id="mcp-save" class="mcp-footer-btn mcp-footer-btn--save">保存</button>
      </div>
    </div>
  </div>
</div>

<div id="quick-messages-modal" class="chat-modal qm-modal hidden" aria-hidden="true">
  <div class="qm-modal-panel">
    <header class="qm-modal-header">
      <div class="qm-header-left">
        <span class="qm-modal-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"/></svg>
        </span>
        <div>
          <h2 class="qm-modal-title">快捷消息</h2>
          <p class="qm-modal-subtitle">按分类管理测试用例 · 点击行填入输入框</p>
        </div>
      </div>
      <div class="qm-header-actions">
        <button type="button" class="qm-btn-add" id="qm-add-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加消息
        </button>
        <button type="button" class="qm-modal-close" data-close-modal="quick-messages-modal" aria-label="关闭">&times;</button>
      </div>
    </header>

    <div class="qm-modal-body">
      <aside class="qm-cat-rail">
        <div class="qm-cat-rail-head">
          <span class="qm-cat-rail-label">分类</span>
          <button type="button" class="qm-cat-add-btn" id="qm-add-category" title="新建分类" aria-label="新建分类">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div class="qm-cat-list" id="qm-cat-list" role="listbox" aria-label="消息分类"></div>
        <div class="qm-cat-inline-add hidden" id="qm-cat-inline-add">
          <input type="text" id="qm-cat-new-input" placeholder="分类名称，Enter 确认" maxlength="20" autocomplete="off">
        </div>
      </aside>

      <section class="qm-msg-main">
        <div class="qm-msg-stats">
          <span class="qm-msg-stats-title" id="qm-current-cat-title">—</span>
          <div class="qm-stat-chips" id="qm-stat-chips"></div>
        </div>
        <div class="quick-messages-container qm-table-wrap" id="qm-table-wrap"></div>
        <div class="qm-empty-state hidden" id="qm-empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" opacity="0.3" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"/></svg>
          <p>「<strong id="qm-empty-cat-name"></strong>」还没有消息<br>添加第一条测试用例吧</p>
          <button type="button" class="qm-btn-add qm-btn-add--sm" id="qm-empty-add">添加消息</button>
        </div>
      </section>
    </div>

    <footer class="qm-modal-footer">
      <span>点击行填入输入框 · 侧栏 ⋯ 可重命名或删除分类</span>
      <span id="qm-footer-note">更改自动保存</span>
    </footer>

    <div class="qm-ctx-menu hidden" id="qm-ctx-menu">
      <button type="button" class="qm-ctx-btn" data-action="rename">重命名</button>
      <button type="button" class="qm-ctx-btn danger" data-action="delete">删除分类</button>
    </div>
  </div>
</div>

<div id="edit-message-modal" class="chat-modal qm-edit-modal hidden" aria-hidden="true">
  <div class="qm-edit-panel">
    <header class="qm-edit-header">
      <div class="qm-edit-header-text">
        <h2 id="edit-message-title" class="qm-edit-title">编辑快捷消息</h2>
        <p class="qm-edit-sub" id="edit-message-subtitle">—</p>
      </div>
      <button type="button" class="qm-modal-close" data-close-modal="edit-message-modal" aria-label="关闭">&times;</button>
    </header>
    <form id="edit-message-form" class="qm-edit-body">
      <input type="hidden" id="edit-message-index">
      <input type="hidden" id="edit-message-id">
      <div class="qm-edit-field-row">
        <div class="qm-edit-field">
          <label for="edit-message-sortid">序号</label>
          <input type="number" id="edit-message-sortid" readonly>
        </div>
        <div class="qm-edit-field">
          <label for="edit-message-category">所属分类</label>
          <select id="edit-message-category"></select>
        </div>
      </div>
      <div class="qm-edit-field">
        <label for="edit-message-content">测试内容</label>
        <textarea id="edit-message-content" rows="4" required placeholder="输入要发送的测试问题…"></textarea>
      </div>
      <div class="qm-edit-field">
        <span class="qm-edit-field-label">预期结果</span>
        <div class="qm-result-seg" id="edit-result-seg">
          <button type="button" class="qm-result-seg-btn active pass" data-result="√">通过</button>
          <button type="button" class="qm-result-seg-btn" data-result="×">失败</button>
        </div>
        <input type="hidden" id="edit-message-result" value="√">
      </div>
      <div class="qm-batch-card batch-mode-group">
        <label class="qm-batch-toggle">
          <input type="checkbox" id="enable-batch-mode">
          批量添加（每行一条消息）
        </label>
        <p class="qm-batch-meta hidden" id="batch-mode-description">将创建 <strong>0</strong> 条消息</p>
      </div>
      <footer class="qm-edit-footer">
        <button type="button" id="cancel-edit" class="qm-btn-ghost">取消</button>
        <button type="submit" id="save-edit" class="qm-btn-primary">保存</button>
      </footer>
    </form>
  </div>
</div>

<div id="prompts-modal" class="chat-modal hidden" aria-hidden="true">
  <div class="chat-modal-panel chat-modal-panel-wide">
    <div class="chat-modal-header">
      <h2 class="chat-modal-title">编辑工具提示词</h2>
      <button type="button" class="chat-modal-close" data-close-modal="prompts-modal" aria-label="关闭">&times;</button>
    </div>
    <div class="chat-modal-body">
      <label class="chat-field">提示词内容
        <textarea id="tool-prompt-content" class="chat-input chat-code-area" rows="16"></textarea>
      </label>
      <div class="chat-modal-footer">
        <button type="button" id="prompt-cancel" class="btn-secondary">取消</button>
        <button type="button" id="prompt-save" class="btn-primary">保存</button>
      </div>
    </div>
  </div>
</div>
`;

/**
 * @param {string} modalId
 */
export function openChatModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * @param {string} modalId
 */
export function closeChatModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

/**
 * @param {string} modalId
 * @param {() => void} [onClose]
 */
export function bindChatModalClose(modalId, onClose) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.dataset.bound === '1') {
    return;
  }
  modal.dataset.bound = '1';

  modal.querySelectorAll(`[data-close-modal="${modalId}"], .context-modal-close`).forEach((btn) => {
    btn.addEventListener('click', () => {
      closeChatModal(modalId);
      onClose?.();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeChatModal(modalId);
      onClose?.();
    }
  });
}
