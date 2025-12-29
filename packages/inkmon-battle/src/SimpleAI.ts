/**
 * SimpleAI - 简单 AI 决策
 *
 * 策略：攻击距离最近的敌人，如果够不到就向其移动
 */

import { hexDistance, type AxialCoord } from '@lomo/hex-grid';
import type { HexBattleInstance } from './HexBattleInstance.js';
import type { InkMonUnit } from './InkMonUnit.js';

/**
 * AI 决策结果
 */
export interface AIDecision {
  /** 行动类型 */
  action: 'move' | 'attack' | 'skip';
  /** 攻击目标（action = 'attack' 时） */
  target?: InkMonUnit;
  /** 移动目的地（action = 'move' 时） */
  destination?: AxialCoord;
  /** 决策原因 */
  reason?: string;
}

/**
 * 简单 AI
 */
export class SimpleAI {
  constructor(private battle: HexBattleInstance) {}

  /**
   * 为当前单位做出决策
   */
  decide(unit: InkMonUnit): AIDecision {
    // 检查单位状态
    if (!unit.hexPosition) {
      return { action: 'skip', reason: 'No position' };
    }

    // 获取敌方队伍
    const enemyTeam = unit.team === 'A' ? 'B' : 'A';
    const enemies = this.battle.getAliveTeamUnits(enemyTeam);

    if (enemies.length === 0) {
      return { action: 'skip', reason: 'No enemies' };
    }

    // 找到最近的敌人
    const nearestEnemy = this.findNearestEnemy(unit, enemies);
    if (!nearestEnemy || !nearestEnemy.hexPosition) {
      return { action: 'skip', reason: 'No reachable enemy' };
    }

    // 检查是否在攻击范围内
    const distance = hexDistance(unit.hexPosition, nearestEnemy.hexPosition);

    if (distance <= unit.attackRange) {
      // 在攻击范围内，执行攻击
      return {
        action: 'attack',
        target: nearestEnemy,
        reason: `Attack ${nearestEnemy.displayName} at distance ${distance}`,
      };
    }

    // 不在攻击范围内，尝试移动
    const moveTarget = this.calculateBestMovePosition(unit, nearestEnemy);

    if (moveTarget) {
      return {
        action: 'move',
        destination: moveTarget,
        reason: `Move towards ${nearestEnemy.displayName}`,
      };
    }

    // 无法移动，跳过
    return { action: 'skip', reason: 'Cannot move closer' };
  }

  /**
   * 找到最近的敌人
   */
  private findNearestEnemy(unit: InkMonUnit, enemies: InkMonUnit[]): InkMonUnit | undefined {
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
      // 推进 ATB
      this.battle.advance(100); // 100ms per step

      // 检查是否有可行动的单位
      const currentUnit = this.battle.getCurrentUnit();
      if (currentUnit) {
        this.step();
        steps++;
      }
    }

    return steps;
  }
}
