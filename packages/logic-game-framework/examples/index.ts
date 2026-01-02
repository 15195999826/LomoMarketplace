/**
 * Examples - 示例代码
 *
 * 本目录包含框架使用示例，展示如何为不同类型的游戏定义事件、标签和组件。
 * 这些是参考实现，游戏应根据自己的需求创建自己的定义。
 *
 * ## 目录结构
 *
 * - `events/` - 战斗游戏事件示例（DamageEvent、HealEvent 等）
 * - `abilities/` - 能力标签和组件示例（RPGAbilityTags、ActiveSkillComponent 等）
 *
 * ## 独立脚本（不在此导出）
 *
 * - `CircularReferenceGC.ts` - 循环引用与 GC 演示
 * - `CreateActorFactory.ts` - createActor 工厂方法示例
 * - `BasicCharacter.ts` - 基础角色创建示例
 *
 * @example
 * ```typescript
 * import {
 *   DamageGameEvent,
 *   createDamageEvent,
 *   onDamaged,
 *   RPGAbilityTags,
 * } from '@lomo/logic-game-framework/examples';
 * ```
 */

// 事件相关
export * from './events/index.js';

// 能力相关
export * from './abilities/index.js';

// 选择器相关
export { TargetSelectors } from './selectors/TargetSelectors.js';

// BasicCharacter 导出（可选使用）
export { Character, createAtkBuff, createTimedBuff, runExample } from './BasicCharacter.js';

// ATB 战斗示例
// 注意：ATB 战斗示例是独立运行的，不从主包导出
// 运行方式：npx tsx examples/atb-battle/run-demo.ts
