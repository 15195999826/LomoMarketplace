/**
 * HealAction - InkMon 治疗 Action
 *
 * 用于恢复 HP 的 Action，支持：
 * - 固定值治疗
 * - 百分比治疗（基于最大 HP）
 * - Pre/Post 双阶段事件处理
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  type ActorRef,
  type GameEventBase,
  createSuccessResult,
  resolveOptionalParam,
  GameWorld,
} from "@lomo/logic-game-framework";

import { createHealEvent } from "../events/ReplayEvents.js";
import type { InkMonActor } from "../actors/InkMonActor.js";

// ========== 类型定义 ==========

/**
 * Pre 阶段治疗事件（用于治疗量修改）
 */
export type PreHealEvent = GameEventBase & {
  readonly kind: "pre_heal";
  readonly source?: ActorRef;
  readonly target: ActorRef;
  readonly healAmount: number;
};

/**
 * HealAction 参数
 */
export interface HealActionParams extends BaseActionParams {
  /** 治疗量（固定值） */
  healAmount?: ParamResolver<number>;
  /** 治疗量（最大 HP 百分比，0-1） */
  healPercent?: ParamResolver<number>;
}

// ========== 辅助函数 ==========

/** 安全的 console.log */
function logMessage(message: string): void {
  (globalThis as { console?: { log: (msg: string) => void } }).console?.log(
    message,
  );
}

// ========== HealAction ==========

/**
 * InkMon 治疗 Action
 *
 * 特性：
 * - 支持固定值治疗
 * - 支持百分比治疗
 * - Pre/Post 双阶段事件处理
 */
export class HealAction extends BaseAction<HealActionParams> {
  readonly type = "inkmon_heal";

  constructor(params: HealActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);
    const state = ctx.gameplayState;

    // 解析参数
    const fixedHeal = resolveOptionalParam(this.params.healAmount, 0, ctx);
    const percentHeal = resolveOptionalParam(this.params.healPercent, 0, ctx);

    const eventProcessor = GameWorld.getInstance().eventProcessor;
    const allEvents: GameEventBase[] = [];

    for (const target of targets) {
      // 获取目标 Actor
      const targetActor = state.getActor(target.id) as InkMonActor | undefined;

      // 计算治疗量
      let healAmount = fixedHeal;

      // 如果有百分比治疗，加上百分比部分
      if (percentHeal > 0) {
        const maxHp = targetActor?.maxHp ?? 100;
        healAmount += Math.floor(maxHp * percentHeal);
      }

      // 治疗量至少为 1
      healAmount = Math.max(1, healAmount);

      // ========== Pre 阶段 ==========
      const preEvent: PreHealEvent = {
        kind: "pre_heal",
        source,
        target,
        healAmount,
      };

      const mutable = eventProcessor.processPreEvent(preEvent, state);

      // 如果被取消（如治疗无效 debuff），跳过
      if (mutable.cancelled) {
        const targetName = targetActor?.displayName ?? target.id;
        logMessage(`  [HealAction] ${targetName} 的治疗被取消`);
        continue;
      }

      // 获取修改后的治疗量
      const modifiedHeal = mutable.getCurrentValue("healAmount") as number;

      // 打印日志
      const sourceActor = source ? state.getActor(source.id) : undefined;
      const sourceName = sourceActor?.displayName ?? source?.id ?? "Unknown";
      const targetName = targetActor?.displayName ?? target.id;

      if (source && source.id !== target.id) {
        logMessage(
          `  [HealAction] ${sourceName} 治疗 ${targetName} ${modifiedHeal} HP`,
        );
      } else {
        logMessage(`  [HealAction] ${targetName} 恢复 ${modifiedHeal} HP`);
      }

      // ========== 产生最终事件 ==========
      const healEvent = ctx.eventCollector.push(
        createHealEvent(target.id, modifiedHeal, source?.id),
      );
      allEvents.push(healEvent);

      // ========== 实际应用治疗 ==========
      if (targetActor) {
        targetActor.heal(modifiedHeal);
      }

      // ========== Post 阶段 ==========
      const actors = state.aliveActors;
      if (actors.length > 0) {
        eventProcessor.processPostEvent(healEvent, actors, state);
      }
    }

    return createSuccessResult(allEvents, {
      healAmount: fixedHeal,
      healPercent: percentHeal,
    });
  }
}

// ========== 工厂函数 ==========

/**
 * 创建固定值治疗 Action
 */
export function createHealAction(params: HealActionParams): HealAction {
  return new HealAction(params);
}

/**
 * 创建百分比治疗 Action（需要提供 targetSelector）
 */
export function createPercentHealAction(
  percent: number,
  targetSelector: HealActionParams["targetSelector"],
): HealAction {
  return new HealAction({
    healPercent: percent,
    targetSelector,
  });
}
