/**
 * DamageAction - 伤害 Action
 *
 * 实现完整的 Pre/Post 双阶段事件处理：
 * 1. Pre 阶段：创建 pre_damage 事件，允许减伤/免疫等被动修改或取消
 * 2. 如果未取消，使用修改后的伤害值产生 damage 事件
 * 3. Post 阶段：立即触发反伤/吸血等被动响应
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  type ActorRef,
  createSuccessResult,
  getCurrentEvent,
  resolveParam,
  resolveOptionalParam,
  GameWorld,
  Actor,
} from '@lomo/logic-game-framework';

/**
 * 伤害类型
 */
export type DamageType = 'physical' | 'magical' | 'pure';

/**
 * Pre 阶段伤害事件
 */
export type PreDamageEvent = {
  readonly kind: 'pre_damage';
  readonly logicTime: number;
  readonly source?: ActorRef;
  readonly target: ActorRef;
  readonly damage: number;
  readonly damageType: DamageType;
};

/**
 * DamageAction 参数
 */
export interface DamageActionParams extends BaseActionParams {
  /** 伤害值（必填） */
  damage: ParamResolver<number>;
  /** 伤害类型（可选，默认 'physical'） */
  damageType?: ParamResolver<DamageType>;
}

/**
 * DamageAction
 *
 * 带 Pre/Post 双阶段处理的伤害 Action。
 */
export class DamageAction extends BaseAction<DamageActionParams> {
  readonly type = 'damage';

  constructor(params: DamageActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 解析参数
    const baseDamage = resolveParam(this.params.damage, ctx);
    const damageType = resolveOptionalParam(this.params.damageType, 'physical', ctx);

    const eventProcessor = GameWorld.getInstance().eventProcessor;
    const allEvents: ReturnType<typeof ctx.eventCollector.push>[] = [];

    // 获取 actors 列表（用于 Post 阶段广播）
    const actors = this.getActorsFromGameplayState(ctx.gameplayState);

    for (const target of targets) {
      // ========== Pre 阶段 ==========
      const preEvent: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage: baseDamage,
        damageType,
      };

      const mutable = eventProcessor.processPreEvent(preEvent, ctx.gameplayState);

      // 如果被取消（如免疫），跳过此目标
      if (mutable.cancelled) {
        const targetName = this.getActorDisplayName(target, ctx.gameplayState);
        console.log(`  [DamageAction] ${targetName} 的伤害被取消`);
        continue;
      }

      // 获取修改后的伤害值
      const finalDamage = mutable.getCurrentValue('damage') as number;

      // 打印日志（使用 displayName）
      const sourceName = this.getActorDisplayName(source, ctx.gameplayState);
      const targetName = this.getActorDisplayName(target, ctx.gameplayState);
      if (finalDamage !== baseDamage) {
        console.log(`  [DamageAction] ${sourceName} 对 ${targetName} 造成 ${finalDamage} ${damageType} 伤害 (原始: ${baseDamage})`);
      } else {
        console.log(`  [DamageAction] ${sourceName} 对 ${targetName} 造成 ${finalDamage} ${damageType} 伤害`);
      }

      // ========== 产生最终事件 ==========
      const damageEvent = ctx.eventCollector.push({
        kind: 'damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage: finalDamage,
        damageType,
      });
      allEvents.push(damageEvent);

      // ========== Post 阶段 ==========
      // 立即触发被动响应（如反伤、吸血）
      if (actors.length > 0) {
        eventProcessor.processPostEvent(damageEvent, actors, ctx.gameplayState);
      }
    }

    return createSuccessResult(allEvents, { damage: baseDamage });
  }

  /**
   * 从 gameplayState 获取 Actor 列表
   *
   * 项目层需要确保 gameplayState 实现了获取 actors 的方法。
   */
  private getActorsFromGameplayState(gameplayState: unknown): Actor[] {
    // 尝试访问 aliveActors 属性（HexBattle 实现）
    if (gameplayState && typeof gameplayState === 'object' && 'aliveActors' in gameplayState) {
      return (gameplayState as { aliveActors: Actor[] }).aliveActors;
    }
    return [];
  }

  /**
   * 获取 Actor 的显示名称
   */
  private getActorDisplayName(actorRef: ActorRef | undefined, gameplayState: unknown): string {
    if (!actorRef) return '???';

    // 尝试从 gameplayState 获取 Actor 实例
    if (gameplayState && typeof gameplayState === 'object' && 'getActor' in gameplayState) {
      const actor = (gameplayState as { getActor: (id: string) => Actor | undefined }).getActor(actorRef.id);
      if (actor) return actor.displayName;
    }

    return actorRef.id;
  }
}
