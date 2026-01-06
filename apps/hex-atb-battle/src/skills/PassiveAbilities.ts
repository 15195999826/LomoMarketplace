/**
 * 被动技能配置
 *
 * 使用 NoInstanceComponent 实现被动触发效果。
 * 被动技能监听游戏事件，满足条件时自动执行 Action 链。
 *
 * ## 设计说明
 *
 * - **Post 阶段响应**：被动技能在事件生效后触发（如反伤、吸血）
 * - **瞬发效果**：使用 NoInstanceComponent，不创建 ExecutionInstance
 */

import {
  type AbilityConfig,
  type GameEventBase,
  NoInstanceComponent,
  type ComponentLifecycleContext,
} from '@lomo/logic-game-framework';

import { ReflectDamageAction } from '../actions/index.js';
import type { DamageEvent } from '../events/index.js';

// ============================================================
// 被动技能配置
// ============================================================

/**
 * 荆棘反伤 - 受到伤害时反弹固定伤害
 *
 * 触发条件：自己受到伤害时
 * 效果：对攻击者造成 2 点纯粹伤害
 */
export const THORN_PASSIVE: AbilityConfig = {
  configId: 'passive_thorn',
  displayName: '荆棘反伤',
  description: '受到伤害时，对攻击者造成 2 点伤害',
  tags: ['passive', 'defensive', 'reflect'],
  components: [
    () => new NoInstanceComponent({
      triggers: [
        {
          eventKind: 'damage',
          filter: (event: GameEventBase, ctx: ComponentLifecycleContext) => {
            const e = event as DamageEvent;
            // 使用回放事件格式：targetActorId/sourceActorId
            const isTarget = e.targetActorId === ctx.owner.id;
            const hasSource = !!e.sourceActorId;
            // 不反弹自己对自己的伤害
            const notSelfDamage = e.sourceActorId !== ctx.owner.id;
            // 不反弹反伤产生的伤害（防止无限循环）
            const notReflectedDamage = !e.isReflected;
            return isTarget && hasSource && notSelfDamage && notReflectedDamage;
          },
        },
      ],
      actions: [
        new ReflectDamageAction({
          damage: 2,
          damageType: 'pure',
        }),
      ],
    }),
  ],
};

// ============================================================
// 导出
// ============================================================

/**
 * 所有被动技能
 */
export const PASSIVE_ABILITIES = {
  Thorn: THORN_PASSIVE,
} as const;

export type PassiveType = keyof typeof PASSIVE_ABILITIES;
