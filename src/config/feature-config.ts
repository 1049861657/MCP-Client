/**
 * 特性配置
 * 集中定义系统中的特性开关和默认值，避免重复配置
 *
 * T2 配置平面：运行时对话能力以 DB `AgentProfile` + `RouteRule` 为准（见 `resolveProfile`）。
 * 本文件中的 ToolsConfig / ChatConfig / ContextConfig 仅作 **Resolver 兜底**（无 Profile、迁移前、单测）。
 * 渠道 normalize 不得再写死 chatOptions；管理员平台改渠道配置不经过本文件。
 */

/**
 * Hook 扩展点（P1-05）
 */
export const HookConfig = {
  /** 内置 PostToolUse 审计日志 */
  enableAuditHook: true,
  /** 内置 PreToolUse 参数体积检查 */
  enableArgsSizeCheck: true,
  /** 工具 arguments JSON 字符上限 */
  maxToolArgsChars: 100_000,
  /** 外部 command hook 超时（毫秒） */
  externalHookTimeoutMs: 30_000
};

/**
 * 工具执行前权限（P1-03）
 */
export const PermissionConfig = {
  /** 确认模式 pending 最长等待 */
  pendingTimeoutMs: 30 * 60 * 1000,
  pendingPollMs: 1000,
  /** 本会话「始终允许」TTL */
  sessionAllowTtlMs: 24 * 60 * 60 * 1000
};

/**
 * 工具相关配置（Resolver 兜底；生产以 AgentProfile 为准）
 */
export const ToolsConfig = {
  // 默认启用 MCP 工具（Profile 未配置时的 fallback）
  enableMCPTools: true,

  // 默认启用提示词
  enablePrompts: true,

  /** Agent Loop 最大工具调用回合数（P0-05 设置页可覆盖，默认 25） */
  maxToolCallRounds: 25,

  /** 客户端可配置上限 */
  maxToolCallRoundsLimit: 100
};

/** 会话内 Todo 规划（P3-01） */
export const PlanningConfig = {
  maxTodoItems: 20,
  planRefreshRounds: 3
};

const HINDSIGHT_CLOUD_BASE_URL = 'https://api.hindsight.vectorize.io';

function isLocalHindsightBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

/** 跨会话 Memory（P3-02-B Hindsight SDK）；环境变量仅 baseUrl + apiKey */
export const MemoryConfig = {
  baseUrl: process.env.HINDSIGHT_BASE_URL?.trim() || HINDSIGHT_CLOUD_BASE_URL,
  apiKey: process.env.HINDSIGHT_API_KEY?.trim() || '',
  bankIdPrefix: 'mcp-client',
  retainMission:
    'Always extract world/experience facts：用户明确偏好与纠正；关于人物、项目、团队与环境的客观陈述；' +
    '用户自述的身份、角色与关系。当用户更正先前说法或描述状态变化时，提取最新状态并保留变化关系' +
    '（例如「曾为 X，现为 Y」），勿并列两条互斥结论。' +
    'Ignore：问候寒暄、对助手身份的闲聊、会话元数据、目录列表、任务进度、' +
    '工具实时输出摘要、临时分支名、密钥与 token。事实一律用简体中文书写。',
  observationsMission:
    'Observation 是从多条世界/经历事实自动归纳的巩固知识，跨会话仍成立' +
    '（可含偏好、模式、关系；非任务进度、非目录快照、非工具输出）。' +
    '综合时识别重复模式与状态变化；当新事实与旧观察矛盾时，' +
    '以更新鲜、更明确的用户表述为准，在单条观察中体现状态演变（曾为 X，现为 Y），' +
    '勿保留两条互斥的并行结论。忽略一次性寒暄、助手身份闲聊、单轮工具结果、临时分支名与密钥。' +
    '一律用简体中文书写。',
  retainExtractionMode: 'concise',
  /** retain() context；当前留空，边界由 retainMission 承担 */
  retainContext: '',
  /** 跨会话注入：observation（归纳观察）+ world（世界事实）；排除 experience（助手侧行为噪音） */
  recallTypes: ['observation', 'world'] as const,
  recallMaxTokens: 4096,
  recallQueryMaxChars: 500,
  sessionRetainMaxChars: 8000,
  perMessageRetainMaxChars: 2000
};

/** Cloud 需 API Key；本地 localhost 可无 Key */
export function isHindsightMemoryConfigured(): boolean {
  if (!MemoryConfig.baseUrl) {
    return false;
  }
  if (isLocalHindsightBaseUrl(MemoryConfig.baseUrl)) {
    return true;
  }
  return MemoryConfig.apiKey.length > 0;
}

export function resolveSkipMemory(requestValue: unknown): boolean {
  if (!isHindsightMemoryConfigured()) {
    return true;
  }
  return requestValue === true;
}

/**
 * 解析请求中的 maxToolCallRounds，钳制到 [1, maxToolCallRoundsLimit]
 */
export function resolveMaxToolCallRounds(requestValue: unknown): number {
  const fallback = ToolsConfig.maxToolCallRounds;
  if (typeof requestValue !== 'number' || !Number.isFinite(requestValue)) {
    return fallback;
  }
  return Math.min(
    ToolsConfig.maxToolCallRoundsLimit,
    Math.max(1, Math.floor(requestValue))
  );
}

/**
 * 聊天相关配置（Resolver 兜底；model/vendor 以 AgentProfile + AIProvider 为准）
 */
export const ChatConfig = {
  // 默认温度值
  defaultTemperature: 0.7,
  
  // 默认最大生成令牌数
  defaultMaxTokens: 2048,
  
  // 默认启用流式响应
  defaultStreamMode: true
};

/**
 * 上下文压缩与 budget（P1-01；enableAutoCompact 可被 AgentProfile 覆盖）
 */
export const ContextConfig = {
  /** 拉丁/英文等：约 4 字符 / token */
  charsPerTokenLatin: 4,

  /** 中文（CJK）等：1 字符 / token（混排时按字种加权，保守不低估） */
  charsPerTokenCjk: 1,

  /** 超过此字符数的 tool 输出落盘（对齐 Claude Code ~30K 落盘阈值） */
  persistThresholdChars: 30_000,

  /** read_persisted_output 默认 PARTIAL 行预览上限（字符） */
  persistPreviewChars: 2000,

  /** 大结果落盘目录（相对项目根） */
  agentOutputsDir: '.agent-outputs',

  /** 落盘文件保留天数；0 表示不自动清理 */
  agentOutputsTtlDays: 7,

  /** read_persisted_output 无 offset/limit 时 PARTIAL 默认行数（对齐 Claude Read 分页） */
  readPartialDefaultLines: 80,

  /** microCompact 保留的最近 tool 消息条数 */
  microCompactKeepRecent: 3,

  /** 是否在 agent-loop 中启用 LLM 自动摘要（可由前端设置覆盖） */
  enableAutoCompact: false,

  /** 估算 token 超此值触发 compactHistory */
  compactThresholdTokens: 32_000,

  /** 摘要 LLM 调用 max_tokens */
  summarizeMaxTokens: 4096,

  /** 送入摘要模型的对话 JSON 上限（字符） */
  summarizeInputMaxChars: 40_000,

  /** 摘要专用模型（空字符串则使用请求中的聊天 model） */
  summarizeModel: '',

  /** 送摘要前单条 tool/assistant 文本截断上限（字符） */
  summarizeToolContentMaxChars: 3000,

  /** 再压缩时「已有上下文摘要」段落保留上限（字符） */
  summarizePriorSummaryMaxChars: 20_000,

  /** 短会话摘要 max_tokens（prompt+对话很短时用，降低生成耗时） */
  summarizeMaxTokensShort: 800,

  /** 判定为短会话的序列化 prompt 字符上限 */
  summarizeShortPromptChars: 6000
};

/**
 * LLM 错误恢复（P1-02）
 */
export const RecoveryConfig = {
  /** 首次失败后额外重试次数（不含首次调用） */
  llmMaxRetries: 1,

  /** 各次重试前等待毫秒（第 1 次重试） */
  llmRetryDelaysMs: [1000] as const
};

/**
 * 按摘要 prompt 体量选择 max_tokens，避免短对话也拉满 4096 拖慢
 */
export function resolveSummarizeMaxTokens(serializedPromptChars: number): number {
  if (serializedPromptChars <= ContextConfig.summarizeShortPromptChars) {
    return ContextConfig.summarizeMaxTokensShort;
  }
  if (serializedPromptChars <= 20_000) {
    return 2000;
  }
  return ContextConfig.summarizeMaxTokens;
}

/**
 * 解析请求中的 enableAutoCompact
 */
export function resolveEnableAutoCompact(requestValue: unknown): boolean {
  if (typeof requestValue === 'boolean') {
    return requestValue;
  }
  return ContextConfig.enableAutoCompact;
}

/**
 * 解析压缩用模型：请求 compactModel > 服务端 summarizeModel > 供应商默认模型
 */
export function resolveCompactModel(
  requestCompactModel: unknown,
  providerDefaultModel: string
): string {
  if (typeof requestCompactModel === 'string' && requestCompactModel.trim().length > 0) {
    return requestCompactModel.trim();
  }
  if (ContextConfig.summarizeModel.trim().length > 0) {
    return ContextConfig.summarizeModel.trim();
  }
  return providerDefaultModel;
}

/**
 * 历史记录相关配置
 */
export const HistoryConfig = {
  // 默认启用历史消息（P0-03 完整 context graph）
  enableMessageHistory: true,

  // 默认历史消息条数（按存储条目计，含 tool 消息）
  defaultMessageHistoryCount: 20
};

/**
 * 日志相关配置
 */
export const LogConfig = {
  // 日志级别
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  /** 每轮 LLM 请求前 debug 输出 tools schema */
  debugLlmTools: false,
  
  // 是否输出到控制台
  console: true,
  
  // 是否输出到文件
  file: true,
  
  // 日志文件配置
  files: {
    // 所有日志文件
    all: 'logs/app.log',
    
    // 错误日志文件
    error: 'logs/error.log'
  },
  
  // 日志文件大小限制（5MB）
  maxSize: 5 * 1024 * 1024,
  
  // 保留日志文件数量
  maxFiles: 5
};

/**
 * 所有特性配置聚合
 */
export const FeatureConfig = {
  tools: ToolsConfig,
  chat: ChatConfig,
  context: ContextConfig,
  recovery: RecoveryConfig,
  history: HistoryConfig,
  log: LogConfig,
  permission: PermissionConfig,
  hook: HookConfig,
  memory: MemoryConfig
}; 