/**
 * SimpleAI - 简单战斗 AI
 *
 * 基于类型相克的简单决策系统
 */

import { hexDistance, type AxialCoord } from '@lomo/hex-grid';
import type { HexBattleInstance } from './HexBattleInstance.js';
import type { InkMonUnit } from './InkMonUnit.js';
import { TypeSystem } from './systems/TypeSystem.js';

/**
 * AI 决策结果
 */
export type AIDecision = {
  /** 行动类型 */
  action: 'move' | 'attack' | 'skip';
  /** 攻击目标（action = 'attack' 时） */
  target?: InkMonUnit;
  /** 移动目的地（action = 'move' 时） */
  destination?: AxialCoord;
  /** 决策原因 */
  reason?: string;
};

/**
 * 简单 AI
 *
 * 策略：
 * 1. 有可攻击目标时，优先攻击类型相克最有效的目标
 * 2. 否则向最近的敌人移动
 * 3. 无法行动则跳过
 */
export class SimpleAI {
  constructor(private battle: HexBattleInstance) {}

  /**
   * 为当前单位做出决策
   */
  decide(unit: InkMonUnit): AIDecision {
    // 检查单位状态
    if (!unit.hexPosition) {
      return { action: 'skip', reason: '没有位置' };
    }

    // 获取敌方队伍
    const enemyTeam = unit.team === 'A' ? 'B' : 'A';
    const enemies = this.battle.getAliveTeamUnits(enemyTeam);

    if (enemies.length === 0) {
      return { action: 'skip', reason: '没有敌人' };
    }

    // 获取可攻击的目标
    const attackableTargets = this.battle.getAttackableTargets(unit);

    if (attackableTargets.length > 0) {
      // 选择最佳攻击目标（考虑类型相克）
      const bestTarget = this.selectBestTarget(unit, attackableTargets);
      return {
        action: 'attack',
        target: bestTarget,
        reason: `攻击 ${bestTarget.displayName}`,
      };
    }

    // 没有可攻击目标，尝试移动
    const nearestEnemy = this.findNearestEnemy(unit, enemies);
    if (!nearestEnemy || !nearestEnemy.hexPosition) {
      return { action: 'skip', reason: '找不到敌人位置' };
    }

    // 获取可移动位置
    const movablePositions = this.battle.getMovablePositions(unit);
    if (movablePositions.length === 0) {
      return { action: 'skip', reason: '无法移动' };
    }

    // 选择最佳移动位置（向敌人靠近）
    const bestPosition = this.calculateBestMovePosition(
      unit,
      nearestEnemy
    );

    if (bestPosition) {
      return {
        action: 'move',
        destination: bestPosition,
        reason: `向 ${nearestEnemy.displayName} 移动`,
      };
    }

    return { action: 'skip', reason: '无法靠近敌人' };
  }

  /**
   * 选择最佳攻击目标
   *
   * 优先级：
   * 1. 类型相克倍率最高
   * 2. 剩余 HP 最低（更容易击杀）
   */
  private selectBestTarget(
    attacker: InkMonUnit,
    targets: InkMonUnit[]
  ): InkMonUnit {
    let bestTarget = targets[0];
    let bestScore = -Infinity;

    const attackerElement = attacker.primaryElement;

    for (const target of targets) {
      // 计算类型相克倍率
      const typeMultiplier = TypeSystem.calculateMultiplier(
        attackerElement,
        target.getElements()
      );

      // 分数 = 类型倍率 * 100 - 剩余HP百分比
      const hpPercent = target.hp / target.maxHp;
      const score = typeMultiplier * 100 - hpPercent * 50;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    return bestTarget;
  }

  /**
   * 找到最近的敌人
   */
  private findNearestEnemy(
    unit: InkMonUnit,
    enemies: InkMonUnit[]
  ): InkMonUnit | undefined {
    if (!unit.hexPosition) return undefined;

    let nearestEnemy: InkMonUnit | undefined;
    let nearestDistance = Infinity;

    for (const enemy of enemies) {
      if (!enemy.hexPosition) continue;

      const distance = hexDistance(unit.hexPosition, enemy.hexPosition);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }

  /**
   * 计算向目标移动的最佳位置
   */
  private calculateBestMovePosition(
    unit: InkMonUnit,
    target: InkMonUnit
  ): AxialCoord | undefined {
    if (!unit.hexPosition || !target.hexPosition) return undefined;

    // 获取可移动的位置（相邻的空格子）
    const movablePositions = this.battle.getMovablePositions(unit);

    if (movablePositions.length === 0) {
      return undefined;
    }

    // 找到距离目标最近的可移动位置
    let bestPosition: AxialCoord | undefined;
    let bestDistance = hexDistance(unit.hexPosition, target.hexPosition);

    for (const pos of movablePositions) {
      const distance = hexDistance(pos, target.hexPosition);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = pos;
      }
    }

    return bestPosition;
  }

  /**
   * 执行 AI 决策
   * @returns 是否成功执行
   */
  executeDecision(unit: InkMonUnit, decision: AIDecision): boolean {
    switch (decision.action) {
      case 'attack':
        if (decision.target) {
          const result = this.battle.executeAttack(unit, decision.target);
          return result.success;
        }
        return false;

      case 'move':
        if (decision.destination) {
          const result = this.battle.executeMove(unit, decision.destination);
          return result.success;
        }
        return false;

      case 'skip':
        const result = this.battle.executeSkip(unit);
        return result.success;

      default:
        return false;
    }
  }

  /**
   * 自动执行一步 AI 决策
   * @returns 决策结果，如果没有可行动的单位则返回 null
   */
  step(): AIDecision | null {
    const currentUnit = this.battle.getCurrentUnit();
    if (!currentUnit) return null;

    const decision = this.decide(currentUnit);
    this.executeDecision(currentUnit, decision);

    return decision;
  }

  /**
   * 自动执行战斗直到结束
   * @param maxSteps 最大步数（防止无限循环）
   * @returns 执行的步数
   */
  runUntilEnd(maxSteps: number = 10000): number {
    let steps = 0;

    while (this.battle.isOngoing && steps < maxSteps) {
      // 推进 ATB 并获取当前可行动单位
      const currentUnit = this.battle.advanceAndGetCurrentUnit(100); // 100ms per step

      // 如果有可行动的单位，执行决策
      if (currentUnit) {
        this.step();
        steps++;
      }
    }

    return steps;
  }
}
