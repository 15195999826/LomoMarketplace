/**
 * DamageAction - InkMon 伤害 Action
 *
 * 支持类型相克的伤害计算：
 * - 属性相克倍率（super effective / not very effective / immune）
 * - STAB 加成（Same Type Attack Bonus）
 * - 暴击系统
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
  resolveParam,
  resolveOptionalParam,
  GameWorld,
} from "@lomo/logic-game-framework";

import type { Element } from "@inkmon/core";
import {
  createDamageEvent,
  type DamageCategory,
} from "../events/ReplayEvents.js";
import {
  TYPE_CHART,
  getEffectivenessLevel,
  type EffectivenessLevel,
} from "../types/TypeEffectiveness.js";
import type { InkMonActor } from "../actors/InkMonActor.js";

// ========== 类型定义 ==========

/** 带有 getActor 方法的游戏状态 */
interface GameplayStateWithGetActor {
  getActor(id: string): InkMonActor | undefined;
}

/** 带有 aliveActors 的游戏状态 */
interface GameplayStateWithAliveActors {
  aliveActors: InkMonActor[];
}

/**
 * Pre 阶段伤害事件（用于减伤/免疫等被动修改）
 */
export type PreDamageEvent = GameEventBase & {
  readonly kind: "pre_damage";
  readonly source?: ActorRef;
  readonly target: ActorRef;
  readonly damage: number;
  readonly damageCategory: DamageCategory;
  readonly element: Element;
  readonly typeMultiplier: number;
  readonly effectiveness: EffectivenessLevel;
  readonly isCritical: boolean;
  readonly isSTAB: boolean;
};

/**
 * DamageAction 参数
 */
export interface DamageActionParams extends BaseActionParams {
  /** 基础伤害值 */
  damage: ParamResolver<number>;
  /** 伤害类型（物理/特殊/纯粹） */
  damageCategory?: ParamResolver<DamageCategory>;
  /** 技能属性 */
  element: ParamResolver<Element>;
  /** 是否启用类型相克（默认 true） */
  useTypeEffectiveness?: ParamResolver<boolean>;
  /** 是否启用 STAB（默认 true） */
  useSTAB?: ParamResolver<boolean>;
  /** 是否启用暴击（默认 true） */
  useCritical?: ParamResolver<boolean>;
  /** 暴击率（默认 0.0625，即 1/16） */
  critRate?: ParamResolver<number>;
  /** 暴击倍率（默认 1.5） */
  critMultiplier?: ParamResolver<number>;
}

// ========== 常量 ==========

/** 默认暴击率 (6.25% = 1/16) */
const DEFAULT_CRIT_RATE = 0.0625;

/** 默认暴击倍率 */
const DEFAULT_CRIT_MULTIPLIER = 1.5;

/** STAB 加成倍率 */
const STAB_MULTIPLIER = 1.5;

// ========== 辅助函数 ==========

/** 安全的 console.log */
function logMessage(message: string): void {
  (globalThis as { console?: { log: (msg: string) => void } }).console?.log(
    message,
  );
}

/**
 * 检查对象是否有 getActor 方法
 */
function hasGetActor(obj: unknown): obj is GameplayStateWithGetActor {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "getActor" in obj &&
    typeof (obj as GameplayStateWithGetActor).getActor === "function"
  );
}

/**
 * 检查对象是否有 aliveActors 属性
 */
function hasAliveActors(obj: unknown): obj is GameplayStateWithAliveActors {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "aliveActors" in obj &&
    Array.isArray((obj as GameplayStateWithAliveActors).aliveActors)
  );
}

/**
 * 计算类型相克倍率
 *
 * @param attackElement 攻击属性
 * @param defenderElements 防御方属性列表
 * @returns 最终倍率（多属性时相乘）
 */
export function calculateTypeMultiplier(
  attackElement: Element,
  defenderElements: Element[],
): number {
  let multiplier = 1;

  for (const defElement of defenderElements) {
    const chart = TYPE_CHART[attackElement];
    if (chart && chart[defElement] !== undefined) {
      multiplier *= chart[defElement];
    }
  }

  return multiplier;
}

/**
 * 检查是否有 STAB 加成
 *
 * @param attackElement 攻击属性
 * @param attackerElements 攻击方属性列表
 */
export function hasSTAB(
  attackElement: Element,
  attackerElements: Element[],
): boolean {
  return attackerElements.includes(attackElement);
}

/**
 * 获取 Actor 的 displayName（安全获取）
 */
function getActorDisplayName(
  ref: ActorRef | undefined,
  ctx: ExecutionContext,
): string {
  if (!ref) return "Unknown";

  const gameplayState = ctx.gameplayState;
  if (hasGetActor(gameplayState)) {
    const actor = gameplayState.getActor(ref.id);
    return actor?.displayName ?? ref.id;
  }

  return ref.id;
}

// ========== DamageAction ==========

/**
 * InkMon 伤害 Action
 *
 * 特性：
 * - 支持属性相克（14 种属性）
 * - 支持 STAB 加成
 * - 支持暴击系统
 * - Pre/Post 双阶段事件处理
 */
export class DamageAction extends BaseAction<DamageActionParams> {
  readonly type = "inkmon_damage";

  constructor(params: DamageActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 解析参数
    const baseDamage = resolveParam(this.params.damage, ctx);
    const damageCategory = resolveOptionalParam(
      this.params.damageCategory,
      "physical",
      ctx,
    );
    const element = resolveParam(this.params.element, ctx);
    const useTypeEffectiveness = resolveOptionalParam(
      this.params.useTypeEffectiveness,
      true,
      ctx,
    );
    const useSTAB = resolveOptionalParam(this.params.useSTAB, true, ctx);
    const useCritical = resolveOptionalParam(
      this.params.useCritical,
      true,
      ctx,
    );
    const critRate = resolveOptionalParam(
      this.params.critRate,
      DEFAULT_CRIT_RATE,
      ctx,
    );
    const critMultiplier = resolveOptionalParam(
      this.params.critMultiplier,
      DEFAULT_CRIT_MULTIPLIER,
      ctx,
    );

    const eventProcessor = GameWorld.getInstance().eventProcessor;
    const allEvents: GameEventBase[] = [];

    // 获取攻击方属性（用于 STAB 判断）
    let attackerElements: Element[] = [];
    if (source && hasGetActor(ctx.gameplayState)) {
      const attacker = ctx.gameplayState.getActor(source.id);
      if (attacker && typeof attacker.getElements === "function") {
        attackerElements = attacker.getElements();
      }
    }

    for (const target of targets) {
      // 获取防御方属性
      let defenderElements: Element[] = [];
      if (hasGetActor(ctx.gameplayState)) {
        const defender = ctx.gameplayState.getActor(target.id);
        if (defender && typeof defender.getElements === "function") {
          defenderElements = defender.getElements();
        }
      }

      // 计算类型相克倍率
      const typeMultiplier = useTypeEffectiveness
        ? calculateTypeMultiplier(element, defenderElements)
        : 1;

      // 如果免疫，跳过
      if (typeMultiplier === 0) {
        const targetName = getActorDisplayName(target, ctx);
        logMessage(`  [DamageAction] ${targetName} 免疫 ${element} 属性攻击`);

        // 产生免疫事件
        const immuneEvent = ctx.eventCollector.push(
          createDamageEvent(target.id, 0, element, {
            sourceActorId: source?.id,
            damageCategory,
            effectiveness: "immune",
            typeMultiplier: 0,
            isCritical: false,
            isSTAB: false,
          }),
        );
        allEvents.push(immuneEvent);
        continue;
      }

      // 计算 STAB
      const isSTAB = useSTAB && hasSTAB(element, attackerElements);
      const stabMultiplier = isSTAB ? STAB_MULTIPLIER : 1;

      // 计算暴击
      const isCritical = useCritical && Math.random() < critRate;
      const critMult = isCritical ? critMultiplier : 1;

      // 计算最终伤害
      let finalDamage = Math.floor(
        baseDamage * typeMultiplier * stabMultiplier * critMult,
      );
      finalDamage = Math.max(1, finalDamage); // 最少造成 1 点伤害

      const effectiveness = getEffectivenessLevel(typeMultiplier);

      // ========== Pre 阶段 ==========
      const preEvent: PreDamageEvent = {
        kind: "pre_damage",
        source,
        target,
        damage: finalDamage,
        damageCategory,
        element,
        typeMultiplier,
        effectiveness,
        isCritical,
        isSTAB,
      };

      const mutable = eventProcessor.processPreEvent(
        preEvent,
        ctx.gameplayState,
      );

      // 如果被取消（如护盾、免疫技能），跳过
      if (mutable.cancelled) {
        const targetName = getActorDisplayName(target, ctx);
        logMessage(`  [DamageAction] ${targetName} 的伤害被取消`);
        continue;
      }

      // 获取修改后的伤害值（可能被减伤技能修改）
      const modifiedDamage = mutable.getCurrentValue("damage") as number;

      // 打印日志
      const sourceName = getActorDisplayName(source, ctx);
      const targetName = getActorDisplayName(target, ctx);
      const effectivenessText = this.getEffectivenessLogText(effectiveness);
      const critText = isCritical ? " 暴击!" : "";
      const stabText = isSTAB ? " STAB" : "";

      logMessage(
        `  [DamageAction] ${sourceName} 对 ${targetName} 造成 ${modifiedDamage} ${damageCategory} (${element}) 伤害${effectivenessText}${critText}${stabText}`,
      );

      // ========== 产生最终事件 ==========
      const damageEvent = ctx.eventCollector.push(
        createDamageEvent(target.id, modifiedDamage, element, {
          sourceActorId: source?.id,
          damageCategory,
          effectiveness,
          typeMultiplier,
          isCritical,
          isSTAB,
        }),
      );
      allEvents.push(damageEvent);

      // ========== Post 阶段 ==========
      // 获取所有 Actor 用于广播 Post 事件
      if (hasAliveActors(ctx.gameplayState)) {
        const actors = ctx.gameplayState.aliveActors;
        if (actors.length > 0) {
          eventProcessor.processPostEvent(
            damageEvent,
            actors,
            ctx.gameplayState,
          );
        }
      }
    }

    return createSuccessResult(allEvents, {
      baseDamage,
      element,
      damageCategory,
    });
  }

  /**
   * 获取效果描述日志文本
   */
  private getEffectivenessLogText(effectiveness: EffectivenessLevel): string {
    switch (effectiveness) {
      case "super_effective":
        return " (效果拔群!)";
      case "not_very_effective":
        return " (效果不佳)";
      case "immune":
        return " (无效)";
      default:
        return "";
    }
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 InkMon 伤害 Action
 */
export function createDamageAction(params: DamageActionParams): DamageAction {
  return new DamageAction(params);
}
