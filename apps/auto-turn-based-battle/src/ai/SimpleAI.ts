/**
 * 简单 AI 决策系统
 *
 * 参考 UEvaluationAIDecisionSystem 设计，提供基础的 AI 决策能力：
 * - 评估当前战场状态
 * - 选择最优行动（攻击/治疗/移动/待机）
 * - 选择最优目标
 */

import type { BattleUnit, GridPosition } from "../actors/BattleUnit.js";
import type { BattleCommand } from "../battle/BattleContext.js";
import {
  type SkillType,
  SKILL_CONFIGS,
  getSkillEffectiveRange,
} from "../config/UnitConfig.js";

/**
 * AI 决策结果
 */
export interface AIDecisionResult {
  /** 决策命令 */
  command: BattleCommand;
  /** 决策原因（调试用） */
  reason: string;
  /** 评分（用于比较决策优劣） */
  score: number;
}

/**
 * 目标评估结果
 */
interface TargetEvaluation {
  target: BattleUnit;
  distance: number;
  score: number;
  inRange: boolean;
}

/**
 * 简单 AI
 *
 * 决策优先级：
 * 1. 如果是治疗职业且队友需要治疗，优先治疗
 * 2. 如果敌人在攻击范围内，使用技能攻击
 * 3. 如果敌人不在范围内且有精力，移动接近
 * 4. 否则待机
 */
export class SimpleAI {
  /** 随机数种子（可选，用于确定性测试） */
  private _seed: number | null = null;

  constructor(seed?: number) {
    this._seed = seed ?? null;
  }

  /**
   * 为单位做出决策
   */
  makeDecision(
    unit: BattleUnit,
    allies: BattleUnit[],
    enemies: BattleUnit[],
  ): AIDecisionResult {
    // 过滤掉自己和死亡单位
    const aliveAllies = allies.filter(
      (a) => a.id !== unit.id && a.isActive && !a.isDead,
    );
    const aliveEnemies = enemies.filter((e) => e.isActive && !e.isDead);

    // 如果没有敌人，待机
    if (aliveEnemies.length === 0) {
      return this.createIdleDecision(unit, "没有存活的敌人");
    }

    // 获取可用行动点
    const availableAP = unit.actionPoint;
    if (availableAP <= 0) {
      return this.createIdleDecision(unit, "行动点耗尽");
    }

    // 评估所有可能的行动
    const decisions: AIDecisionResult[] = [];

    // 1. 检查治疗（如果是治疗职业）
    if (unit.defaultSkill === "Heal") {
      const healDecision = this.evaluateHeal(unit, aliveAllies);
      if (healDecision) {
        decisions.push(healDecision);
      }
    }

    // 2. 检查攻击技能
    const attackDecision = this.evaluateAttack(unit, aliveEnemies);
    if (attackDecision) {
      decisions.push(attackDecision);
    }

    // 3. 检查移动
    const moveDecision = this.evaluateMove(unit, aliveEnemies, aliveAllies);
    if (moveDecision) {
      decisions.push(moveDecision);
    }

    // 4. 待机作为兜底
    decisions.push(this.createIdleDecision(unit, "没有更好的选择"));

    // 选择得分最高的决策
    decisions.sort((a, b) => b.score - a.score);
    return decisions[0];
  }

  /**
   * 评估治疗行动
   */
  private evaluateHeal(
    unit: BattleUnit,
    allies: BattleUnit[],
  ): AIDecisionResult | null {
    const healConfig = SKILL_CONFIGS["Heal"];
    const healRange = getSkillEffectiveRange(
      "Heal",
      unit.attackRange,
      unit.moveRange,
    );
    const healCost = healConfig.actionPointCost;

    // 检查是否能使用治疗
    if (!unit.hasEnoughActionPoint(healCost)) {
      return null;
    }
    if (!unit.isSkillReady("Heal")) {
      return null;
    }

    // 找到需要治疗的队友（包括自己）
    const healTargets = [...allies, unit].filter((a) => {
      const hpPercent = a.hp / a.maxHp;
      const distance = unit.distanceTo(a);
      return hpPercent < 0.7 && distance <= healRange;
    });

    if (healTargets.length === 0) {
      return null;
    }

    // 优先治疗 HP 最低的
    healTargets.sort((a, b) => a.hpPercent - b.hpPercent);
    const target = healTargets[0];
    const hpMissing = 1 - target.hpPercent;

    // 治疗评分：缺失 HP 越多分数越高
    const score = 80 + hpMissing * 20;

    return {
      command: {
        type: "ability",
        executorId: unit.id,
        abilityId: "Heal",
        targetId: target.id,
      },
      reason: `治疗 ${target.displayName}（HP: ${(target.hpPercent * 100).toFixed(0)}%）`,
      score,
    };
  }

  /**
   * 评估攻击行动
   */
  private evaluateAttack(
    unit: BattleUnit,
    enemies: BattleUnit[],
  ): AIDecisionResult | null {
    // 获取可用技能（优先职业技能，其次普攻）
    const skills: SkillType[] = [];

    // 检查职业技能
    const classSkill = unit.defaultSkill;
    if (
      classSkill !== "Heal" &&
      classSkill !== "Move" &&
      classSkill !== "Idle"
    ) {
      if (unit.isSkillReady(classSkill)) {
        const config = SKILL_CONFIGS[classSkill];
        if (unit.hasEnoughActionPoint(config.actionPointCost)) {
          skills.push(classSkill);
        }
      }
    }

    // 普通攻击作为备选
    const normalAttackConfig = SKILL_CONFIGS["NormalAttack"];
    if (unit.hasEnoughActionPoint(normalAttackConfig.actionPointCost)) {
      skills.push("NormalAttack");
    }

    if (skills.length === 0) {
      return null;
    }

    // 评估每个技能对每个目标的得分
    let bestResult: AIDecisionResult | null = null;

    for (const skill of skills) {
      const config = SKILL_CONFIGS[skill];
      const range = getSkillEffectiveRange(
        skill,
        unit.attackRange,
        unit.moveRange,
      );

      // 评估所有敌人
      const evaluations = this.evaluateTargets(unit, enemies, range);
      const inRangeTargets = evaluations.filter((e) => e.inRange);

      if (inRangeTargets.length === 0) {
        continue;
      }

      // 选择最优目标
      inRangeTargets.sort((a, b) => b.score - a.score);
      const bestTarget = inRangeTargets[0];

      // 计算决策得分
      // 职业技能比普攻得分高，低血量目标得分高
      const skillBonus = skill !== "NormalAttack" ? 20 : 0;
      const damageBonus = config.damageMultiplier * 10;
      const score = 50 + skillBonus + damageBonus + bestTarget.score;

      if (!bestResult || score > bestResult.score) {
        bestResult = {
          command: {
            type: "ability",
            executorId: unit.id,
            abilityId: skill,
            targetId: bestTarget.target.id,
          },
          reason: `使用 ${config.name} 攻击 ${bestTarget.target.displayName}`,
          score,
        };
      }
    }

    return bestResult;
  }

  /**
   * 评估移动行动
   */
  private evaluateMove(
    unit: BattleUnit,
    enemies: BattleUnit[],
    allies: BattleUnit[],
  ): AIDecisionResult | null {
    const moveConfig = SKILL_CONFIGS["Move"];

    // 检查是否能移动
    if (!unit.hasEnoughActionPoint(moveConfig.actionPointCost)) {
      return null;
    }
    if (!unit.hasEnoughStamina(moveConfig.staminaCost)) {
      return null;
    }

    // 找到最近的敌人
    const targetEvaluations = this.evaluateTargets(unit, enemies, Infinity);

    if (targetEvaluations.length === 0) {
      return null;
    }

    // 选择最优目标（综合距离和威胁度）
    targetEvaluations.sort((a, b) => b.score - a.score);
    const primaryTarget = targetEvaluations[0].target;

    // 计算理想攻击位置
    const attackRange = unit.attackRange;
    const currentDistance = unit.distanceTo(primaryTarget);

    // 如果已经在攻击范围内，不需要移动
    if (currentDistance <= attackRange) {
      return null;
    }

    // 计算移动目标位置（朝向敌人移动）
    const moveRange = Math.min(unit.moveRange, unit.availableStamina);
    const targetPos = this.calculateMoveTarget(
      unit.gridPosition,
      primaryTarget.gridPosition,
      moveRange,
      attackRange,
    );

    // 如果无法移动到更好的位置，返回 null
    const newDistance = this.manhattanDistance(
      targetPos,
      primaryTarget.gridPosition,
    );
    if (newDistance >= currentDistance) {
      return null;
    }

    // 移动评分：越能接近敌人得分越高
    const distanceReduction = currentDistance - newDistance;
    const score = 30 + distanceReduction * 5;

    return {
      command: {
        type: "move",
        executorId: unit.id,
        abilityId: "Move",
        targetPosition: targetPos,
      },
      reason: `移动接近 ${primaryTarget.displayName}（距离 ${currentDistance} -> ${newDistance}）`,
      score,
    };
  }

  /**
   * 评估目标列表
   */
  private evaluateTargets(
    unit: BattleUnit,
    targets: BattleUnit[],
    range: number,
  ): TargetEvaluation[] {
    return targets.map((target) => {
      const distance = unit.distanceTo(target);
      const inRange = distance <= range;

      // 评分因素：
      // - 低血量目标优先（可击杀）
      // - 距离近优先
      // - 威胁度高的优先（高攻击）
      const hpFactor = (1 - target.hpPercent) * 30;
      const distanceFactor = Math.max(0, 10 - distance);
      const threatFactor = (target.atk / 100) * 10;

      const score = hpFactor + distanceFactor + threatFactor;

      return { target, distance, score, inRange };
    });
  }

  /**
   * 计算移动目标位置
   */
  private calculateMoveTarget(
    from: GridPosition,
    to: GridPosition,
    moveRange: number,
    attackRange: number,
  ): GridPosition {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    // 目标距离：刚好进入攻击范围
    const targetDistance = Math.max(0, distance - attackRange);
    const moveDistance = Math.min(moveRange, targetDistance);

    if (moveDistance <= 0 || distance === 0) {
      return from;
    }

    // 简化：优先沿较大差值的方向移动
    let newX = from.x;
    let newY = from.y;
    let remaining = moveDistance;

    // 先移动 x 方向
    if (dx !== 0) {
      const xMove = Math.min(Math.abs(dx), remaining) * Math.sign(dx);
      newX += xMove;
      remaining -= Math.abs(xMove);
    }

    // 再移动 y 方向
    if (dy !== 0 && remaining > 0) {
      const yMove = Math.min(Math.abs(dy), remaining) * Math.sign(dy);
      newY += yMove;
    }

    return { x: newX, y: newY };
  }

  /**
   * 创建待机决策
   */
  private createIdleDecision(
    unit: BattleUnit,
    reason: string,
  ): AIDecisionResult {
    return {
      command: {
        type: "idle",
        executorId: unit.id,
        abilityId: "Idle",
      },
      reason,
      score: 0,
    };
  }

  /**
   * 曼哈顿距离
   */
  private manhattanDistance(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * 简单随机数（如果设置了种子）
   */
  private random(): number {
    if (this._seed !== null) {
      // 简单的 LCG 随机数生成器
      this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
      return this._seed / 0x7fffffff;
    }
    return Math.random();
  }
}

/**
 * 创建简单 AI 实例
 */
export function createSimpleAI(seed?: number): SimpleAI {
  return new SimpleAI(seed);
}
