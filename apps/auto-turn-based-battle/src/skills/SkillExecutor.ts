/**
 * 技能执行器 - 根据技能定义执行效果
 *
 * 将数据驱动的技能定义转换为实际的游戏效果。
 * 支持多种效果类型和目标选择方式。
 *
 * ## 职责
 *
 * 1. 解析技能定义中的效果列表
 * 2. 根据目标类型选择实际目标
 * 3. 计算效果数值（伤害/治疗等）
 * 4. 应用效果到目标
 * 5. 发出事件供表演层/日志系统消费
 *
 * ## 使用示例
 *
 * ```typescript
 * const executor = new SkillExecutor(eventCollector, targetResolver);
 * const result = executor.execute(skill, source, primaryTarget);
 *
 * if (result.success) {
 *   for (const effectResult of result.effectResults) {
 *     console.log(`${effectResult.effectType}: ${effectResult.value}`);
 *   }
 * }
 * ```
 */

import type { EventCollector } from "@lomo/logic-game-framework";

import type { BattleUnit } from "../actors/BattleUnit.js";
import {
  type SkillDefinition,
  type SkillEffect,
  type EffectResult,
  type SkillExecutionResult,
  type DamageEffect,
  type HealEffect,
  type TargetType,
  calculateValue,
} from "./SkillEffect.js";
import {
  createDamageEvent,
  createHealEvent,
  createDeathEvent,
  createSkillUseEvent,
  createCooldownEvent,
  type BattleEvent,
} from "../events/BattleEvents.js";

// ========== 目标解析器接口 ==========

/**
 * 目标解析器接口
 *
 * 用于根据目标类型获取实际的目标单位列表。
 * 由 Battle 层实现，因为它知道所有单位的位置和状态。
 */
export interface ITargetResolver {
  /**
   * 获取所有敌人
   */
  getEnemies(source: BattleUnit): BattleUnit[];

  /**
   * 获取所有友方（包括自己）
   */
  getAllies(source: BattleUnit): BattleUnit[];

  /**
   * 获取范围内的目标
   *
   * @param center 中心位置单位
   * @param radius 范围半径
   * @param candidates 候选目标
   */
  getUnitsInRange(
    center: BattleUnit,
    radius: number,
    candidates: BattleUnit[],
  ): BattleUnit[];

  /**
   * 计算两个单位之间的距离
   */
  getDistance(a: BattleUnit, b: BattleUnit): number;
}

// ========== 技能执行器 ==========

/**
 * 技能执行器
 *
 * 负责解析和执行技能效果，将数据驱动的技能定义转换为实际的游戏效果。
 */
export class SkillExecutor {
  private _eventCollector: EventCollector;
  private _targetResolver: ITargetResolver;

  constructor(eventCollector: EventCollector, targetResolver: ITargetResolver) {
    this._eventCollector = eventCollector;
    this._targetResolver = targetResolver;
  }

  /**
   * 执行技能
   *
   * @param skill 技能定义
   * @param source 施法者
   * @param primaryTarget 主目标（可选，某些技能不需要目标）
   * @returns 技能执行结果
   */
  execute(
    skill: SkillDefinition,
    source: BattleUnit,
    primaryTarget?: BattleUnit,
  ): SkillExecutionResult {
    const result: SkillExecutionResult = {
      skillId: skill.id,
      sourceId: source.id,
      primaryTargetId: primaryTarget?.id,
      success: false,
      effectResults: [],
    };

    // 检查行动点
    if (!source.hasEnoughActionPoint(skill.actionPointCost)) {
      return result;
    }

    // 检查精力
    if (skill.staminaCost > 0 && !source.hasEnoughStamina(skill.staminaCost)) {
      return result;
    }

    // 消耗资源
    source.consumeActionPoint(skill.actionPointCost);
    if (skill.staminaCost > 0) {
      source.consumeStamina(skill.staminaCost);
    }

    // 发出技能使用事件
    this.emitEvent(
      createSkillUseEvent(
        source.id,
        skill.id,
        skill.name,
        primaryTarget?.id,
        primaryTarget?.gridPosition,
      ),
    );

    // 执行每个效果
    for (const effect of skill.effects) {
      const effectResults = this.executeEffect(effect, source, primaryTarget);
      result.effectResults.push(...effectResults);
    }

    // 触发冷却
    if (skill.cooldown > 0) {
      source.triggerCooldown(skill.id as any);
      this.emitEvent(
        createCooldownEvent(source.id, skill.id, skill.name, skill.cooldown),
      );
    }

    result.success = true;
    return result;
  }

  /**
   * 执行单个效果
   */
  private executeEffect(
    effect: SkillEffect,
    source: BattleUnit,
    primaryTarget?: BattleUnit,
  ): EffectResult[] {
    // 获取实际目标
    const targets = this.resolveTargets(effect, source, primaryTarget);

    if (targets.length === 0) {
      return [];
    }

    // 根据效果类型执行
    switch (effect.type) {
      case "damage":
        return this.executeDamageEffect(effect, source, targets);

      case "heal":
        return this.executeHealEffect(effect, source, targets);

      case "buff":
      case "debuff":
        // TODO: 实现 Buff 系统
        return targets.map((t) => ({
          effectType: effect.type,
          targetId: t.id,
          success: true,
        }));

      case "dispel":
        // TODO: 实现驱散系统
        return targets.map((t) => ({
          effectType: effect.type,
          targetId: t.id,
          success: true,
        }));

      case "teleport":
        // TODO: 实现传送效果
        return targets.map((t) => ({
          effectType: effect.type,
          targetId: t.id,
          success: true,
        }));

      default:
        return [];
    }
  }

  /**
   * 解析目标
   */
  private resolveTargets(
    effect: SkillEffect,
    source: BattleUnit,
    primaryTarget?: BattleUnit,
  ): BattleUnit[] {
    switch (effect.target) {
      case "single":
        return primaryTarget ? [primaryTarget] : [];

      case "self":
        return [source];

      case "aoe":
        if (!primaryTarget) return [];
        const enemies = this._targetResolver.getEnemies(source);
        return this._targetResolver.getUnitsInRange(
          primaryTarget,
          effect.aoeRadius ?? 1,
          enemies,
        );

      case "aoe_self":
        const allEnemies = this._targetResolver.getEnemies(source);
        return this._targetResolver.getUnitsInRange(
          source,
          effect.aoeRadius ?? 1,
          allEnemies,
        );

      case "all_enemies":
        return this._targetResolver.getEnemies(source);

      case "all_allies":
        return this._targetResolver.getAllies(source);

      case "random_enemy": {
        const possibleEnemies = this._targetResolver.getEnemies(source);
        if (possibleEnemies.length === 0) return [];
        const randomIndex = Math.floor(Math.random() * possibleEnemies.length);
        return [possibleEnemies[randomIndex]];
      }

      case "random_ally": {
        const possibleAllies = this._targetResolver.getAllies(source);
        if (possibleAllies.length === 0) return [];
        const randomIndex = Math.floor(Math.random() * possibleAllies.length);
        return [possibleAllies[randomIndex]];
      }

      case "lowest_hp_ally": {
        const allies = this._targetResolver.getAllies(source);
        if (allies.length === 0) return [];
        const sorted = [...allies].sort((a, b) => a.hpPercent - b.hpPercent);
        return [sorted[0]];
      }

      case "lowest_hp_enemy": {
        const enemies = this._targetResolver.getEnemies(source);
        if (enemies.length === 0) return [];
        const sorted = [...enemies].sort((a, b) => a.hpPercent - b.hpPercent);
        return [sorted[0]];
      }

      default:
        return [];
    }
  }

  /**
   * 执行伤害效果
   */
  private executeDamageEffect(
    effect: DamageEffect,
    source: BattleUnit,
    targets: BattleUnit[],
  ): EffectResult[] {
    const results: EffectResult[] = [];
    const isAoe = targets.length > 1;

    for (const target of targets) {
      // 计算基础伤害
      let damage = calculateValue(effect.value, source, target);

      // 暴击计算
      let isCrit = false;
      if (effect.canCrit) {
        const critRate = source.critRate + (effect.bonusCritRate ?? 0);
        isCrit = Math.random() < critRate;

        if (isCrit) {
          const critDamage = source.critDamage + (effect.bonusCritDamage ?? 0);
          damage = Math.floor(damage * critDamage);
        }
      }

      // 防御减伤
      let defense = target.def;
      if (effect.armorPenetration) {
        defense = Math.floor(defense * (1 - effect.armorPenetration));
      }

      // 根据伤害类型计算减伤
      if (effect.damageType === "physical") {
        // 物理伤害：防御力减少伤害
        const reduction = Math.floor(defense * 0.5);
        damage = Math.max(1, damage - reduction);
      } else if (effect.damageType === "magical") {
        // 魔法伤害：防御力效果减半
        const reduction = Math.floor(defense * 0.25);
        damage = Math.max(1, damage - reduction);
      }
      // 真实伤害：不减伤

      // 应用伤害
      const actualDamage = target.takeDamage(damage);
      const targetDied = target.isDead;

      // 发出伤害事件
      this.emitEvent(
        createDamageEvent(
          source.id,
          target.id,
          actualDamage,
          isCrit,
          target.hp,
          effect.description,
          isAoe,
        ),
      );

      // 如果目标死亡，发出死亡事件
      if (targetDied) {
        this.emitEvent(createDeathEvent(target.id, source.id));
      }

      results.push({
        effectType: "damage",
        targetId: target.id,
        success: true,
        value: actualDamage,
        isCrit,
        targetDied,
      });
    }

    return results;
  }

  /**
   * 执行治疗效果
   */
  private executeHealEffect(
    effect: HealEffect,
    source: BattleUnit,
    targets: BattleUnit[],
  ): EffectResult[] {
    const results: EffectResult[] = [];

    for (const target of targets) {
      // 计算治疗量
      let healAmount = calculateValue(effect.value, source, target);

      // 暴击治疗（可选）
      let isCrit = false;
      if (effect.canCrit) {
        isCrit = Math.random() < source.critRate;
        if (isCrit) {
          healAmount = Math.floor(healAmount * source.critDamage);
        }
      }

      // 应用治疗
      const actualHeal = target.heal(healAmount);

      // 发出治疗事件
      this.emitEvent(createHealEvent(source.id, target.id, actualHeal, target.hp));

      results.push({
        effectType: "heal",
        targetId: target.id,
        success: true,
        value: actualHeal,
        isCrit,
      });
    }

    return results;
  }

  /**
   * 发出事件
   */
  private emitEvent(event: BattleEvent): void {
    this._eventCollector.push(event);
  }
}

/**
 * 创建技能执行器
 */
export function createSkillExecutor(
  eventCollector: EventCollector,
  targetResolver: ITargetResolver,
): SkillExecutor {
  return new SkillExecutor(eventCollector, targetResolver);
}
