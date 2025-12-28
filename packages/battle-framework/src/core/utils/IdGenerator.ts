/**
 * ID 生成器
 * 生成唯一标识符，用于 Actor、Ability、Modifier 等
 */

let counter = 0;

/**
 * 生成唯一 ID
 * @param prefix 可选前缀，便于调试时识别类型
 * @returns 唯一 ID 字符串
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const count = (counter++).toString(36);
  const random = Math.random().toString(36).substring(2, 6);

  return prefix ? `${prefix}_${timestamp}${count}${random}` : `${timestamp}${count}${random}`;
}

/**
 * 重置计数器（仅用于测试）
 */
export function resetIdCounter(): void {
  counter = 0;
}

/**
 * IdGenerator 类（提供面向对象的接口）
 */
export class IdGenerator {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  /**
   * 生成唯一 ID
   */
  generate(): string {
    return generateId(this.prefix);
  }

  /**
   * 静态方法：生成唯一 ID
   */
  static generate(prefix: string = ''): string {
    return generateId(prefix);
  }
}
