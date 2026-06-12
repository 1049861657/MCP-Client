import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { generateRequestId } from '../utils/request-id.js';
import { getProviderForUser } from '../providers/ai-providers.js';
import { getMcpClientForUser } from '../core/mcp/index.js';
import { resolvePrincipal } from '../services/runtime-context.service.js';
import type { SessionUser } from '../lib/request-session.js';
import { InternalMessage } from '../core/agent-harness/types.js';
import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds,
  ToolsConfig
} from '../config/feature-config.js';
import { ConfigService } from '../services/config.service.js';
import { sanitizeEnabledSystemToolNames } from '../core/agent-harness/system-tools/system-tool-registry.js';
import { ToolPolicyService } from '../services/tool-policy.service.js';
import { ToolPreferencesService } from '../services/tool-preferences.service.js';
import { getWebChannelAdapter } from '../channels/web/web-channel.adapter.js';
import { normalizeWebInbound } from '../channels/web/normalize-web-inbound.js';
import { SSE_KEEP_ALIVE_INTERVAL_MS } from '../channels/web/sse-config.js';
import { publishInbound } from '../message-bus/inbound-queue.js';
import { ChatStore } from '../services/chat-store.service.js';
import { resolvePermissionPending } from '../core/agent-harness/permission-pending.js';
import {
  assertPermissionSessionKey,
  grantSessionToolAllow
} from '../core/agent-harness/permission-session.js';

/**
 * AI Chat API 控制器
 */
export class AiController {
  /**
   * 获取服务实例（per-user 路径；userId=null 使用 seed bucket）
   */
  private static async getServiceForVendorAndUser(
    vendorId: string | undefined,
    userId: string | null
  ) {
    return getProviderForUser(userId, vendorId);
  }

  /**
   * 处理聊天请求（非流式，已废弃）。
   * 保留供调试与兼容；不走 Envelope/Bus，与 chatStream 架构分叉。Web 生产路径请用 chatStream。
   */
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      // 从请求体中获取参数
      const { 
        message, 
        messages = [],
        model, 
        temperature, 
        maxTokens, 
        vendor,
        enableTools = ToolsConfig.enableMCPTools,  // 使用统一配置
        enablePrompts = ToolsConfig.enablePrompts,  // 使用统一配置
        maxToolCallRounds: maxToolCallRoundsBody,
        enableAutoCompact,
        compactModel
      } = req.body;

      const maxToolCallRounds = resolveMaxToolCallRounds(maxToolCallRoundsBody);
      const requestId = generateRequestId();
      const autoCompact = resolveEnableAutoCompact(enableAutoCompact);
      
      // 验证消息
      if (!message && messages.length === 0) {
        res.status(400).json({ 
          error: '缺少消息参数' 
        });
        return;
      }
      
      // 获取对应供应商的服务（per-user；chat 是非流式调试路径，无 session 信息故 userId=null）
      const service = await AiController.getServiceForVendorAndUser(vendor, null);
      
      // 检查服务是否有效
      if (!service) { return;}

      // 准备消息
      let processedMessage;
      if (messages.length > 0) {
        // 使用提供的消息历史
        processedMessage = messages;
        const toolMessageCount = messages.filter((m: { role?: string }) => m.role === 'tool').length;
        Logger.info('API', `收到聊天请求, requestId: ${requestId}, 消息数量: ${messages.length}, tool消息: ${toolMessageCount}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 提示词: ${enablePrompts}, 最大工具轮次: ${maxToolCallRounds}, 自动压缩: ${autoCompact}`);
      } else {
        // 使用单条消息
        processedMessage = message;
        Logger.info('API', `收到聊天请求, 消息长度: ${message.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 提示词: ${enablePrompts}, 自动压缩: ${autoCompact}`);
      }
      
      // 调用OpenAI服务
      const response = await service.chat(
        processedMessage,
        model,
        temperature,
        maxTokens,
        enableTools,
        enablePrompts,  // 传递提示词状态
        maxToolCallRounds,
        requestId,
        autoCompact,
        compactModel
      );
      
      // 返回响应
      res.json({
        success: true,
        requestId,
        content: response.content,
        model: response.model,
        tool_calls: response.tool_calls,
        usage: response.usage
      });
    } catch (error: any) {
      Logger.error('API', '处理聊天请求时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  /**
   * 处理流式聊天请求
   * @param req 请求对象
   * @param res 响应对象
   */
  static async chatStream(req: Request, res: Response): Promise<void> {
    const requestId = generateRequestId();
    const webAdapter = getWebChannelAdapter();
    let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

    const clearKeepAlive = (): void => {
      if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    };

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: begin\ndata: ${JSON.stringify({ requestId })}\n\n`);

      const abortController = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
        clearKeepAlive();
      });

      let envelope;
      let user: SessionUser | undefined;
      let configUserId: string | null = null;
      try {
        const body = req.body as Record<string, unknown>;
        const principal = await resolvePrincipal(req);
        user = principal.user;
        configUserId = principal.configUserId;
        await AiController.sanitizeWebMcpServerIds(body, configUserId);
        await AiController.sanitizeWebEnabledToolNames(body, configUserId);
        AiController.sanitizeWebEnabledSystemToolNames(body);
        envelope = await normalizeWebInbound({
          body,
          requestId,
          abortSignal: abortController.signal,
          ...(user ? { userId: user.id } : {})
        });
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: errMessage })}\n\n`);
        res.end();
        return;
      }

      const vendor = typeof envelope.channelMeta.vendor === 'string'
        ? envelope.channelMeta.vendor
        : undefined;
      const service = await AiController.getServiceForVendorAndUser(vendor, configUserId);
      if (!service) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: '无可用 AI 服务，请先配置提供商' })}\n\n`);
        res.end();
        return;
      }

      const { messages, chatOptions = {} } = envelope.payload;
      const toolMessageCount = messages.filter((m) => m.role === 'tool').length;
      Logger.info(
        'API',
        `收到流式聊天请求, requestId: ${requestId}, 消息数量: ${messages.length}, tool消息: ${toolMessageCount}, ` +
          `供应商: ${vendor || '默认'}, 工具模式: ${chatOptions.enableTools}, ` +
          `提示词: ${chatOptions.enablePrompts}, 最大工具轮次: ${chatOptions.maxToolCallRounds}, ` +
          `自动压缩: ${chatOptions.enableAutoCompact}, 忽略跨会话记忆: ${chatOptions.skipMemory === true}`
      );

      webAdapter.registerSink(requestId, {
        response: res,
        abortController,
        clearKeepAlive
      });

      try {
        await publishInbound(envelope);
      } catch (error: unknown) {
        clearKeepAlive();
        webAdapter.unregisterSink(requestId);
        const errMessage = error instanceof Error ? error.message : String(error);
        Logger.error('API', `publishInbound 失败 requestId=${requestId}:`, error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: errMessage })}\n\n`);
        res.end();
        return;
      }

      keepAliveTimer = setInterval(() => {
        if (!res.writableEnded) {
          res.write(': keep-alive\n\n');
        }
      }, SSE_KEEP_ALIVE_INTERVAL_MS);
    } catch (error: unknown) {
      clearKeepAlive();
      webAdapter.unregisterSink(requestId);
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', '处理流式聊天请求时出错:', error);
      if (!res.writableEnded) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: errMessage })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * 预览下次请求上下文体量（P1-01-06，无 LLM）
   */
  static async contextPreview(req: Request, res: Response): Promise<void> {
    try {
      const {
        messages: bodyMessages = [],
        enableAutoCompact,
        contextOverride = null
      } = req.body as {
        messages?: InternalMessage[];
        enableAutoCompact?: boolean;
        contextOverride?: InternalMessage[] | null;
      };

      const { configUserId } = await resolvePrincipal(req);
      const messages = await AiController.resolveContextMessages(req, bodyMessages);
      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages 必须为数组' });
        return;
      }

      const service = await AiController.getServiceForVendorAndUser(
        (req.body as { vendor?: string }).vendor,
        configUserId
      );
      if (!service) {
        res.status(500).json({ error: '无法获取 AI 服务' });
        return;
      }

      const preview = service.previewMainModelContext(messages, {
        enableAutoCompact: resolveEnableAutoCompact(enableAutoCompact),
        contextOverride: Array.isArray(contextOverride) && contextOverride.length > 0
          ? contextOverride
          : null
      });
      res.json({ success: true, preview });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', '上下文预览失败:', error);
      res.status(500).json({ error: errMessage });
    }
  }

  /**
   * 手动压缩会话消息历史（P1-01-05）
   */
  static async compact(req: Request, res: Response): Promise<void> {
    try {
      const {
        messages: bodyMessages = [],
        vendor,
        compactModel
      } = req.body as {
        messages?: InternalMessage[];
        vendor?: string;
        compactModel?: string;
      };

      const { configUserId } = await resolvePrincipal(req);
      const messages = await AiController.resolveContextMessages(req, bodyMessages);
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: '缺少 messages 参数或消息为空' });
        return;
      }

      const service = await AiController.getServiceForVendorAndUser(vendor, configUserId);
      if (!service) {
        res.status(500).json({ error: '无法获取 AI 服务' });
        return;
      }

      const requestId = generateRequestId();
      const inputChars = messages.reduce((sum, m) => {
        const c = m.content;
        return sum + (typeof c === 'string' ? c.length : 0);
      }, 0);
      const wallStarted = Date.now();
      Logger.info(
        'API',
        `收到压缩请求 requestId=${requestId} messages=${messages.length} inputChars=${inputChars} ` +
          `vendor=${vendor || '默认'} compactModel=${compactModel ?? '(默认)'}`
      );

      const compacted = await service.compactMessages(messages, compactModel);
      const elapsedMs = Date.now() - wallStarted;
      Logger.info('API', `压缩完成 requestId=${requestId} elapsedMs=${elapsedMs}`);
      res.json({
        success: true,
        requestId,
        elapsedMs,
        messages: compacted
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', '压缩会话失败:', error);
      res.status(500).json({ error: errMessage });
    }
  }

  /**
   * 获取当前可用的MCP工具
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getAvailableTools(req: Request, res: Response): Promise<void> {
    try {
      const { configUserId } = await resolvePrincipal(req);
      const serverInfo = await getMcpClientForUser(configUserId).getServerInfo();
      
      res.json({
        success: true,
        server: serverInfo.server.name,
        tools: serverInfo.tools
      });
    } catch (error: any) {
      Logger.error('API', '获取可用工具时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  /**
   * 获取MCP服务器列表
   * @param req 请求对象
   * @param res 响应对象
   */
  /**
   * 获取 MCP 服务器列表。
   * - 默认 `scope=connected`：Web 聊天可选列表，仅已连接（与服务信息页可用一致）
   * - `scope=configured`：Admin 渠道配置，全部已添加的 MCP（与连接状态解耦）
   */
  static async getMCPServers(req: Request, res: Response): Promise<void> {
    try {
      const { configUserId } = await resolvePrincipal(req);
      const client = getMcpClientForUser(configUserId);
      const scopeRaw = req.query.scope;
      const scope = typeof scopeRaw === 'string' ? scopeRaw : 'connected';
      const [serverInfo, store] = await Promise.all([
        client.getServerInfo(),
        ToolPreferencesService.getAll()
      ]);
      const connectedIds = new Set(
        (serverInfo.connectedServers ?? []).map((server) => server.id)
      );
      const serverTools = serverInfo.serverTools ?? {};

      const toRow = (id: string, name: string, isConnected: boolean) => {
        const { enabled, total } = ToolPolicyService.countEnabledTools(id, serverTools, store);
        return {
          id,
          name,
          isConnected,
          toolsEnabled: enabled,
          toolsTotal: total
        };
      };

      if (scope === 'configured') {
        const rows = await ConfigService.listConfiguredMcpServers(configUserId ?? undefined);
        const servers = rows.map((row) =>
          toRow(row.serverId, row.name, connectedIds.has(row.serverId))
        );
        res.json({ success: true, servers });
        return;
      }

      if (scope !== 'connected') {
        res.status(400).json({ error: 'scope 须为 connected 或 configured' });
        return;
      }

      const connected = serverInfo.connectedServers ?? [];
      const servers = connected.map((server) => toRow(server.id, server.name, true));

      res.json({
        success: true,
        servers
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error('API', '获取MCP服务器列表时出错:', error);
      res.status(500).json({
        error: message
      });
    }
  }

  /**
   * P1-03：用户确认 pending 工具调用（确认模式）
   */
  static async permissionResolve(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      const requestId = typeof body.requestId === 'string' ? body.requestId : '';
      const toolCallId = typeof body.toolCallId === 'string' ? body.toolCallId : '';
      const decision = body.decision === 'approve' ? 'approve' : body.decision === 'deny' ? 'deny' : null;

      if (!requestId || !toolCallId || !decision) {
        res.status(400).json({ success: false, error: '缺少 requestId、toolCallId 或 decision' });
        return;
      }

      const applied = await resolvePermissionPending(requestId, toolCallId, decision);
      if (!applied) {
        res.status(409).json({ success: false, error: '确认已处理或已过期' });
        return;
      }

      if (decision === 'approve' && body.alwaysAllowSession === true) {
        if (typeof body.sessionKey !== 'string' || typeof body.codeName !== 'string') {
          res.status(400).json({ success: false, error: '记住此工具需要 sessionKey 与 codeName' });
          return;
        }
        await grantSessionToolAllow(
          assertPermissionSessionKey(body.sessionKey),
          body.codeName
        );
      }

      res.json({ success: true, requestId, toolCallId, decision });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', 'permission-resolve 失败:', error);
      res.status(500).json({ success: false, error: errMessage });
    }
  }

  /**
   * 解析上下文消息来源：已登录且带 sessionId → 服务端组装（历史 + 压缩基线）；
   * 否则（guest）沿用 body messages[]。供 context-preview / compact 复用，与 chatStream 同源。
   */
  private static async resolveContextMessages(
    req: Request,
    bodyMessages: InternalMessage[]
  ): Promise<InternalMessage[]> {
    const user = req.user;
    const sessionId =
      typeof (req.body as { sessionId?: unknown }).sessionId === 'string'
        ? (req.body as { sessionId: string }).sessionId.trim()
        : '';
    if (!user || !sessionId) {
      return bodyMessages;
    }
    const contextOptions = (req.body as { contextOptions?: { messageHistoryCount?: unknown } })
      .contextOptions;
    const messageHistoryCount =
      typeof contextOptions?.messageHistoryCount === 'number' && contextOptions.messageHistoryCount > 0
        ? contextOptions.messageHistoryCount
        : undefined;
    return ChatStore.assembleContextMessages(user.id, sessionId, { messageHistoryCount });
  }

  /** Web 请求体 mcpServerIds 仅保留当前已连接的 MCP 服务器 */
  static async sanitizeWebMcpServerIds(
    body: Record<string, unknown>,
    configUserId: string | null
  ): Promise<void> {
    if (!Array.isArray(body.mcpServerIds)) {
      return;
    }
    const serverInfo = await getMcpClientForUser(configUserId).getServerInfo();
    const connectedIds = new Set(
      (serverInfo.connectedServers ?? []).map((server) => server.id)
    );
    body.mcpServerIds = body.mcpServerIds.filter(
      (id): id is string => typeof id === 'string' && connectedIds.has(id)
    );
  }

  /** Web 请求体 enabledSystemToolNames 仅保留已注册的 System 工具 */
  static sanitizeWebEnabledSystemToolNames(body: Record<string, unknown>): void {
    if (!Array.isArray(body.enabledSystemToolNames)) {
      return;
    }
    body.enabledSystemToolNames = sanitizeEnabledSystemToolNames(
      body.enabledSystemToolNames.filter((name): name is string => typeof name === 'string')
    );
  }

  /** Web 请求体 enabledToolNames 仅保留当前已连接服务器上已启用的 MCP 工具 codeName */
  static async sanitizeWebEnabledToolNames(
    body: Record<string, unknown>,
    configUserId: string | null
  ): Promise<void> {
    if (!Array.isArray(body.enabledToolNames)) {
      return;
    }
    const mcpServerIds = Array.isArray(body.mcpServerIds)
      ? body.mcpServerIds.filter((id): id is string => typeof id === 'string')
      : [];
    body.enabledToolNames = await ToolPolicyService.sanitizeWebEnabledToolNames(
      body.enabledToolNames.filter((name): name is string => typeof name === 'string'),
      mcpServerIds,
      configUserId
    );
  }
} 