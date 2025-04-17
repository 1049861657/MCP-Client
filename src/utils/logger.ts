import winston from 'winston';
import { join } from 'path';
import { LogConfig } from '../config/feature-config.js';
import { getProjectRoot } from './path-util.js';

// 创建基本日志格式（用于文件输出）
const logFormat = winston.format.printf(({ level, message, timestamp, context }) => {
  return `${timestamp} [${level.toUpperCase()}] [${context || ''}] ${message}`;
});

// 创建控制台日志格式（没有时间戳）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: false, message: false, level: true }),
  winston.format.printf(({ level, message, context }) => {
    return `${level} [${context || ''}] ${message}`;
  })
);

// 创建Winston logger实例
const winstonLogger = winston.createLogger({
  level: LogConfig.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: []
});

// 添加控制台输出
if (LogConfig.console) {
  winstonLogger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 添加文件输出
if (LogConfig.file) {
  try {
    // 获取日志文件的绝对路径
    const projectRoot = getProjectRoot(import.meta.url);
    const allLogsPath = join(projectRoot, LogConfig.files.all);
    const errorLogsPath = join(projectRoot, LogConfig.files.error);
    
    // 所有日志
    winstonLogger.add(new winston.transports.File({ 
      filename: allLogsPath,
      maxsize: LogConfig.maxSize,
      maxFiles: LogConfig.maxFiles,
      options: { encoding: 'utf8' }
    }));
    
    // 仅错误日志
    winstonLogger.add(new winston.transports.File({ 
      filename: errorLogsPath,
      level: 'error',
      maxsize: LogConfig.maxSize,
      maxFiles: LogConfig.maxFiles,
      options: { encoding: 'utf8' }
    }));
  } catch (error) {
    console.error('无法创建日志文件:', error);
  }
}

/**
 * 日志工具类
 * 使用Winston实现，兼容原有接口
 */
export class Logger {
  /**
   * 输出信息级别日志
   * @param context 上下文
   * @param message 消息
   */
  static info(context: string, message: string): void {
    winstonLogger.info(message, { context });
  }

  /**
   * 输出错误级别日志
   * @param context 上下文
   * @param message 消息
   * @param error 错误对象（可选）
   */
  static error(context: string, message: string, error?: unknown): void {
    let fullMessage = message;
    if (error) {
      if (error instanceof Error) {
        fullMessage += `: ${error.message}`;
        // 如果需要堆栈，可以添加: ${error.stack}
      } else {
        fullMessage += `: ${error}`;
      }
    }
    winstonLogger.error(fullMessage, { context });
  }

  /**
   * 输出警告级别日志
   * @param context 上下文
   * @param message 消息
   */
  static warn(context: string, message: string): void {
    winstonLogger.warn(message, { context });
  }

  /**
   * 输出调试级别日志
   * @param context 上下文
   * @param message 消息
   */
  static debug(context: string, message: string): void {
    winstonLogger.debug(message, { context });
  }
} 