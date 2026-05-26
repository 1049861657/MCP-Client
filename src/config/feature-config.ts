/**
 * 特性配置
 * 集中定义系统中的特性开关和默认值，避免重复配置
 */

/**
 * 工具相关配置
 */
export const ToolsConfig = {
  // 默认启用MCP工具
  enableMCPTools: true,

  /** System 内置工具（P1-01-11：read_persisted_output 等） */
  enableSystemTools: true,
  
  // 默认关闭参数校验
  enableParamValidation: false,

  // 默认启用提示词
  enablePrompts: true,

  /** Agent Loop 最大工具调用回合数（P0-05 设置页可覆盖，默认 25） */
  maxToolCallRounds: 25,

  /** 客户端可配置上限 */
  maxToolCallRoundsLimit: 100
};

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
 * 聊天相关配置
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
 * 上下文压缩与 budget（P1-01）
 */
export const ContextConfig = {
  /** 拉丁/英文等：约 4 字符 / token */
  charsPerTokenLatin: 4,

  /** 中文（CJK）等：1 字符 / token（混排时按字种加权，保守不低估） */
  charsPerTokenCjk: 1,

  /** 超过此字符数的 tool 输出落盘 */
  persistThresholdChars: 8000,

  /** 落盘后在消息中保留的 preview 字符数 */
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
  history: HistoryConfig,
  log: LogConfig
}; 