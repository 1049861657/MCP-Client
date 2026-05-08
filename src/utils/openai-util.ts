import { Logger } from './logger.js';
import { prisma } from '../lib/prisma.js';

/**
 * OpenAI工具名称编解码工具类 - 提供静态方法用于工具名称和函数名之间的转换
 * 使用更短、更随机但可逆的编码方式，并通过数据库持久化存储
 */
export class OpenAINameCodec {
  // Base62字符集：0-9, a-z, A-Z
  private static readonly CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // 输出的编码名称长度
  private static readonly OUTPUT_LENGTH = 8;

  /**
   * 将字符串转换为32位哈希值
   * @param str 输入字符串
   * @returns 哈希字符串
   */
  private static hash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0; // 转换为32位整数
    }
    return Math.abs(h).toString(16);
  }

  /**
   * 基于种子生成特定长度的随机字符串
   * @param seed 种子字符串
   * @param length 输出长度
   * @returns 随机字符串
   */
  private static generateRandomString(seed: string, length: number): string {
    const seedHash = this.hash(seed);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      // 使用种子哈希的不同部分来选择字符
      const index = parseInt(seedHash.charAt(i % seedHash.length) + seedHash.charAt((i + 1) % seedHash.length), 16) % this.CHARSET.length;
      result += this.CHARSET[index];
    }
    
    return result;
  }

  /**
   * 生成唯一的短编码
   * @param inputString 输入字符串
   * @returns 唯一短编码
   */
  private static generateUniqueCode(inputString: string): string {
    const seed = this.hash(inputString);
    const raw = seed.substring(0, 4) + this.generateRandomString(seed, this.OUTPUT_LENGTH - 4);

    // Gemini API 要求函数名首字符必须是字母或下划线（不能是数字）
    // 若首字符恰好是数字，替换为字母集中对应的字符
    const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const first = raw[0];
    const safeFirst = /^[0-9]$/.test(first)
      ? LETTERS[parseInt(first, 10) % LETTERS.length]
      : first;

    return safeFirst + raw.slice(1);
  }

  /**
   * 将工具名编码为函数名
   * @param toolName 工具名称
   * @param serverId 可选的服务器ID，如果提供则与工具名一起编码以避免冲突
   * @returns 编码后的函数名
   */
  public static async encode(toolName: string, serverId?: string): Promise<string> {
    try {
      // 如果提供了serverId，将其与toolName合并
      const inputString = serverId ? `${serverId}:${toolName}` : toolName;
      
      // 1. 首先检查数据库中是否已经有此映射
      const existingMapping = await prisma.toolCodeMapping.findFirst({
        where: { originalString: inputString }
      });
      
      // 如果找到了已存在的映射，直接返回编码
      if (existingMapping) {
        return existingMapping.code;
      }
      
      // 2. 生成新的唯一编码
      let code = this.generateUniqueCode(inputString);
      
      // 3. 检查此编码是否已被使用（确保唯一性）
      let codeExists = await prisma.toolCodeMapping.findUnique({
        where: { code }
      });
      
      // 如果编码已存在，尝试生成新的
      while (codeExists) {
        const extraSeed = this.hash(code + Date.now());
        code = this.hash(inputString).substring(0, 4) + this.generateRandomString(extraSeed, this.OUTPUT_LENGTH - 4);
        codeExists = await prisma.toolCodeMapping.findUnique({
          where: { code }
        });
      }
      
      // 4. 将新的映射保存到数据库
      await prisma.toolCodeMapping.create({
        data: {
          code,
          originalString: inputString
        }
      });
      
      return code;
    } catch (error) {
      Logger.warn('NAMECODEC', `名称编码失败: ${error}`);
      // 生成一个基于哈希的简短回退编码
      const fallbackHash = this.hash(toolName).substring(0, this.OUTPUT_LENGTH);
      return fallbackHash;
    }
  }

  /**
   * 将函数名解码为工具名
   * @param functionName 函数名
   * @returns 解码后的工具名（不包含服务器ID）
   */
  public static async decode(codeName: string): Promise<string> {
    try {
      // 从数据库查找映射关系
      const mapping = await prisma.toolCodeMapping.findUnique({
        where: { code: codeName }
      });
      
      // 如果找到了映射关系，解析原始字符串
      if (mapping) {
        // 原始字符串格式为 "serverId:toolName"
        const originalString = mapping.originalString;
        
        const colonIndex = originalString.indexOf(':');

        return colonIndex !== -1 
          ? originalString.substring(colonIndex + 1) 
          : originalString;
      }
      
      // 如果没有找到，返回原始编码值
      return codeName;
    } catch (error) {
      Logger.warn('NAMECODEC', `名称解码失败: ${error}`);
      return codeName;
    }
  }
}