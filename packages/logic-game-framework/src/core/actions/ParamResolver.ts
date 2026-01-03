/**
 * 参数解析器
 *
 * 支持 Action 参数的延迟求值。
 * 参数可以是固定值，也可以是函数（在 execute 时求值）。
 */

import type { ExecutionContext } from './ExecutionContext.js';

/**
 * 参数解析器类型
 *
 * 支持两种形式：
 * 1. 直接值 T
 * 2. 函数 (ctx: ExecutionContext) => T
 *
 * @example
 * ```typescript
 * interface DamageActionParams {
 *   damage: ParamResolver<number>;  // 可以是 50 或 (ctx) => ctx.xxx
 * }
 * ```
 */
export type ParamResolver<T> = T | ((ctx: ExecutionContext) => T);

/**
 * 解析参数值
 *
 * @param resolver 参数解析器（值或函数）
 * @param ctx 执行上下文
 * @returns 解析后的值
 *
 * @example
 * ```typescript
 * const damage = resolveParam(this.params.damage, ctx);
 * ```
 */
export function resolveParam<T>(resolver: ParamResolver<T>, ctx: ExecutionContext): T {
  if (typeof resolver === 'function') {
    return (resolver as (ctx: ExecutionContext) => T)(ctx);
  }
  return resolver;
}

/**
 * 解析可选参数值
 *
 * @param resolver 参数解析器（可能为 undefined）
 * @param defaultValue 默认值
 * @param ctx 执行上下文
 * @returns 解析后的值，如果 resolver 为 undefined 则返回默认值
 */
export function resolveOptionalParam<T>(
  resolver: ParamResolver<T> | undefined,
  defaultValue: T,
  ctx: ExecutionContext
): T {
  if (resolver === undefined) {
    return defaultValue;
  }
  return resolveParam(resolver, ctx);
}
