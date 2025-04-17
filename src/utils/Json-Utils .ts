/**
 * JSON值转换工具类
 * 提供各种JSON类型转换的实用方法
 */
export class JsonUtils {
    /**
     * 将JSON值转换为字符串数组
     * @param json 要转换的JSON值
     * @param fallback 转换失败时的默认值，默认为空数组
     * @returns 转换后的字符串数组
     */
    static toStringArray(json: any | null | undefined, fallback: string[] = []): string[] {
      // 处理空值
      if (json === null || json === undefined) {
        return fallback;
      }
  
      // 如果已经是数组，将每个元素转换为字符串
      if (Array.isArray(json)) {
        return json.map(item => String(item));
      }
  
      // 如果是字符串但看起来像JSON数组，尝试解析
      if (typeof json === 'string' && json.trim().startsWith('[') && json.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) {
            return parsed.map(item => String(item));
          }
        } catch (e) {
          // 解析失败，忽略错误
        }
      }
  
      // 如果是单个值，创建只包含该值的数组
      if (typeof json === 'string' || typeof json === 'number' || typeof json === 'boolean') {
        return [String(json)];
      }
  
      // 其他情况返回默认值
      return fallback;
    }
  
    /**
     * 将JSON值转换为数字数组
     * @param json 要转换的JSON值
     * @param fallback 转换失败时的默认值，默认为空数组
     * @returns 转换后的数字数组
     */
    static toNumberArray(json: any | null | undefined, fallback: number[] = []): number[] {
      // 处理空值
      if (json === null || json === undefined) {
        return fallback;
      }
  
      // 如果已经是数组，尝试将每个元素转换为数字
      if (Array.isArray(json)) {
        return json
          .map(item => {
            const num = Number(item);
            return isNaN(num) ? null : num;
          })
          .filter((num): num is number => num !== null);
      }
  
      // 如果是字符串但看起来像JSON数组，尝试解析
      if (typeof json === 'string' && json.trim().startsWith('[') && json.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) {
            return parsed
              .map(item => {
                const num = Number(item);
                return isNaN(num) ? null : num;
              })
              .filter((num): num is number => num !== null);
          }
        } catch (e) {
          // 解析失败，忽略错误
        }
      }
  
      // 如果是单个值，尝试转换为数字
      if (typeof json === 'string' || typeof json === 'number' || typeof json === 'boolean') {
        const num = Number(json);
        return isNaN(num) ? fallback : [num];
      }
  
      // 其他情况返回默认值
      return fallback;
    }
  
    /**
     * 将JSON值转换为布尔值
     * @param json 要转换的JSON值
     * @param fallback 转换失败时的默认值，默认为false
     * @returns 转换后的布尔值
     */
    static toBoolean(json: any | null | undefined, fallback: boolean = false): boolean {
      if (json === null || json === undefined) {
        return fallback;
      }
  
      if (typeof json === 'boolean') {
        return json;
      }
  
      if (typeof json === 'string') {
        const lowered = json.toLowerCase().trim();
        if (lowered === 'true' || lowered === '1' || lowered === 'yes') {
          return true;
        }
        if (lowered === 'false' || lowered === '0' || lowered === 'no') {
          return false;
        }
      }
  
      if (typeof json === 'number') {
        return json !== 0;
      }
  
      return fallback;
    }
  
    /**
     * 将JSON值转换为对象
     * @param json 要转换的JSON值
     * @param fallback 转换失败时的默认值，默认为空对象
     * @returns 转换后的对象
     */
    static toObject<T = Record<string, any>>(json: any | null | undefined, fallback: T = {} as T): T {
      if (json === null || json === undefined) {
        return fallback;
      }
  
      // 如果已经是对象
      if (typeof json === 'object' && !Array.isArray(json)) {
        return json as T;
      }
  
      // 如果是字符串，尝试解析
      if (typeof json === 'string') {
        try {
          const parsed = JSON.parse(json);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as T;
          }
        } catch (e) {
          // 解析失败，忽略错误
        }
      }
  
      return fallback;
    }
  }