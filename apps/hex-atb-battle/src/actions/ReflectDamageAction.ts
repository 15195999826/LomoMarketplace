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
 *
 * ## 反伤链防护
 *
 * 反伤产生的 damage 事件带有 `isReflected: true` 标记，
 * 荆棘被动应在 filter 中排除这类事件，避免无限循环。
 */

import {
  type IAction,
  type ActionResult,
  type ExecutionContext,
  type ActorRef,
  createSuccessResult,
  getCurrentEvent,
  GameWorld,
  Actor,
} from '@lomo/logic-game-framework';

import { getActorsFromGameplayState, getActorDisplayName } from '../utils/ActionUtils.js';

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
 * 反伤产生的伤害事件（带标记）
 */
export type ReflectedDamageEvent = DamageEventLike & {
  /** 标记：这是反伤产生的伤害，不应再触发反伤 */
  isReflected: true;
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
 * 产生的事件带有 `isReflected: true` 标记，防止反伤链无限循环。
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

    // 获取显示名称
    const ownerName = getActorDisplayName(owner, ctx.gameplayState);
    const attackerName = getActorDisplayName(attacker, ctx.gameplayState);
    console.log(`  [ReflectDamageAction] ${ownerName} 反伤 ${attackerName} ${damage} 点 ${damageType} 伤害`);

    // 产生伤害事件（对攻击者），带 isReflected 标记防止无限循环
    const reflectEvent = ctx.eventCollector.push({
      kind: 'damage',
      logicTime: currentEvent.logicTime,
      source: owner,
      target: attacker,
      damage,
      damageType,
      isReflected: true,  // 标记：这是反伤，不应再触发反伤
    });

    // Post 阶段：触发其他被动（如吸血），但不会触发反伤（因为有 isReflected 标记）
    const actors = getActorsFromGameplayState(ctx.gameplayState);
    if (actors.length > 0) {
      const eventProcessor = GameWorld.getInstance().eventProcessor;
      eventProcessor.processPostEvent(reflectEvent, actors, ctx.gameplayState);
    }

    return createSuccessResult([reflectEvent], { damage, target: attacker.id });
  }
}
