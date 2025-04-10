/**
 * 简单的日志工具
 */
export class Logger {
  static info(context: string, message: string): void {
    console.log(`[${context}] ${message}`);
  }

  static error(context: string, message: string, error?: unknown): void {
    console.error(`[${context}] ${message}`, error instanceof Error ? error.message : error);
  }

  static warn(context: string, message: string): void {
    console.warn(`[${context}] ${message}`);
  }

  static debug(context: string, message: string): void {
    console.debug(`[${context}] ${message}`);
  }
} 