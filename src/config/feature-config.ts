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
  
  // 默认关闭参数校验
  enableParamValidation: false
};

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
 * 历史记录相关配置
 */
export const HistoryConfig = {
  // 默认禁用历史消息
  enableMessageHistory: false,
  
  // 默认历史消息数量
  defaultMessageHistoryCount: 3
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
  history: HistoryConfig,
  log: LogConfig
};

export default FeatureConfig; 