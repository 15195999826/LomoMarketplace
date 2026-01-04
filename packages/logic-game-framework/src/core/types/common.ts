/**
 * 通用类型定义
 * 包含框架核心的引用类型
 */

// 重新导出 Vector3（从 @lomo/core）
export { Vector3 } from '@lomo/core';

/**
 * Actor 引用
 * 用于在事件和上下文中引用 Actor，避免直接持有对象引用
 */
export type ActorRef = {
  readonly id: string;
};

/**
 * 钩子上下文
 * 用于 Ability 钩子分发时传递的上下文信息
 */
export type HookContext = {
  readonly hookName: string;
  readonly relatedActors: ActorRef[];
  readonly data: Readonly<Record<string, unknown>>;
};

/**
 * 激活检查上下文
 * 用于 AbilityComponent.canActivate 检查
 */
export type ActivationContext = {
  readonly source: ActorRef;
  readonly targets: ActorRef[];
  readonly logicTime: number;
};

/**
 * 激活错误
 * 当 canActivate 返回 false 时可附带的错误信息
 */
export type ActivationError = {
  readonly code: string;
  readonly message: string;
};

/**
 * 创建激活错误的辅助函数
 */
export function createActivationError(code: string, message: string): ActivationError {
  return { code, message };
}

/**
 * 位置信息（2D，用于向后兼容）
 *
 * @deprecated 推荐使用 Vector3 作为位置类型
 */
export type Position = {
  readonly x: number;
  readonly y: number;
};

/**
 * 方向枚举
 */
export type Direction = 'up' | 'down' | 'left' | 'right';
