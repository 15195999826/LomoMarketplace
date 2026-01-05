/**
 * ReflectDamageAction - 反伤 Action
 *
 * 用于被动技能触发时，对攻击来源造成固定伤害。
 * 从触发事件中获取 source（攻击者），对其造成伤害。
 *
 * ## 设计说明
 *
 * 此 Action 直接实现 IAction 接口（不继承 BaseAction），
 * 因为目标是从触发事件动态获取的，不使用 targetSelector。
 */

import {
  type IAction,
  type ActionResult,
  type ExecutionContext,
  type ActorRef,
  createSuccessResult,
  getCurrentEvent,
} from '@lomo/logic-game-framework';

import type { DamageType } from './DamageAction.js';

/**
 * 伤害事件（从触发链获取）
 */
type DamageEventLike = {
  kind: 'damage';
  logicTime: number;
  source?: ActorRef;
  target: ActorRef;
  damage: number;
  damageType: DamageType;
};

/**
 * ReflectDamageAction 参数
 */
export interface ReflectDamageActionParams {
  /** 反伤固定伤害值 */
  damage: number;
  /** 伤害类型（可选，默认 'pure'） */
  damageType?: DamageType;
}

/**
 * ReflectDamageAction - 反伤 Action
 *
 * 从触发事件（damage）中获取攻击来源，对其造成固定伤害。
 */
export class ReflectDamageAction implements IAction {
  readonly type = 'reflectDamage';
  private readonly params: ReflectDamageActionParams;

  constructor(params: ReflectDamageActionParams) {
    this.params = params;
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);

    // 从触发事件获取攻击来源
    const triggerEvent = currentEvent as DamageEventLike;
    const attacker = triggerEvent.source;

    if (!attacker) {
      console.log('  [ReflectDamageAction] 无攻击来源，跳过反伤');
      return createSuccessResult([], { skipped: true });
    }

    const damage = this.params.damage;
    const damageType = this.params.damageType ?? 'pure';
    const owner = ctx.ability?.owner;

    console.log(`  [ReflectDamageAction] ${owner?.id} 反伤 ${attacker.id} ${damage} 点 ${damageType} 伤害`);

    // 产生伤害事件（对攻击者）
    const event = ctx.eventCollector.push({
      kind: 'damage',
      logicTime: currentEvent.logicTime,
      source: owner,
      target: attacker,
      damage,
      damageType,
    });

    return createSuccessResult([event], { damage, target: attacker.id });
  }
}
