import { Logger } from './logger.js';

/**
 * OpenAI工具名称编解码工具类 - 提供静态方法用于工具名称和函数名之间的转换
 */
export class OpenAINameCodec {
  /**
   * 将工具名编码为函数名
   * @param toolName 工具名称
   * @returns 编码后的函数名
   */
  public static encode(toolName: string): string {
    try {
      // 使用Base64编码
      let encoded = btoa(toolName);
      // 替换特殊字符使其适合作为函数名
      encoded = encoded.replace(/\+/g, '_').replace(/\//g, '-').replace(/=/g, '');
      return encoded;
    } catch (error) {
      // 处理非ASCII字符
      try {
        const utf8Input = encodeURIComponent(toolName)
          .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
        let encoded = btoa(utf8Input);
        encoded = encoded.replace(/\+/g, '_').replace(/\//g, '-').replace(/=/g, '');
        return encoded;
      } catch (utf8Error) {
        Logger.warn('NAMECODEC', `名称编码失败: ${error}, ${utf8Error}`);
        return toolName;
      }
    }
  }

  /**
   * 将函数名解码为工具名
   * @param functionName 函数名
   * @returns 解码后的工具名
   */
  public static decode(functionName: string): string {
    try {
      // 恢复特殊字符
      let padded = functionName.replace(/_/g, '+').replace(/-/g, '/');
      // 添加适当的填充
      while (padded.length % 4 !== 0) {
        padded += '=';
      }
      // Base64解码
      return atob(padded);
    } catch (error) {
      try {
        // 尝试解码UTF-8内容
        let padded = functionName.replace(/_/g, '+').replace(/-/g, '/');
        while (padded.length % 4 !== 0) {
          padded += '=';
        }
        const decoded = atob(padded);
        return decodeURIComponent(decoded.split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      } catch (utf8Error) {
        Logger.warn('NAMECODEC', `名称解码失败: ${error}, ${utf8Error}`);
        return functionName;
      }
    }
  }
}