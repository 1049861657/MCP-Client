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
 * 所有特性配置聚合
 */
export const FeatureConfig = {
  tools: ToolsConfig,
  chat: ChatConfig,
  history: HistoryConfig
};

export default FeatureConfig; 