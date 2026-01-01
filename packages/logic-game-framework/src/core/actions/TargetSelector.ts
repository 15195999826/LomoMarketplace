/**
 * TargetSelector - 目标选择器类型定义
 *
 * 定义 Action 如何选择目标。
 * TargetSelector 是一个函数，接收 ExecutionContext，返回目标列表。
 *
 * ## 设计原则
 *
 * 1. **函数式**：TargetSelector 是纯函数，不持有状态
 * 2. **配置驱动**：项目层提供预定义选择器，常用场景无需写函数
 * 3. **灵活性**：特殊场景可以直接写函数
 *
 * ## 使用示例
 *
 * ```typescript
 * // 项目层定义选择器
 * const MySelectors = {
 *   triggerTarget: (ctx) => [(ctx.triggerEvent as MyEvent).target],
 * };
 *
 * // Action 使用
 * new DamageAction({ damage: 50 })
 *     .setTargetSelector(MySelectors.triggerTarget);
 *
 * // 或直接写函数
 * new HealAction({ heal: 100 })
 *     .setTargetSelector((ctx) => {
 *         const battle = ctx.gameplayState as Battle;
 *         return battle.getAllies(ctx.ability!.owner);
 *     });
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { ExecutionContext } from './ExecutionContext.js';

/**
 * 目标选择器类型
 *
 * 接收执行上下文，返回目标 ActorRef 列表。
 * 具体的选择器实现由项目层提供。
 */
export type TargetSelector = (ctx: ExecutionContext) => ActorRef[];
