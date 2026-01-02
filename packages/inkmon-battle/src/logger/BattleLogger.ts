/**
 * BattleLogger - 战斗日志系统
 *
 * 生成完整的战斗日志，反映战斗流程
 */

import type { AxialCoord } from '@lomo/hex-grid';
import type { Element } from '@inkmon/core';
import type { EffectivenessLevel } from '../types/TypeEffectiveness.js';

/**
 * 日志级别
 */
export type LogLevel = 'none' | 'minimal' | 'full';

/**
 * 日志条目
 */
export interface LogEntry {
  readonly timestamp: number;
  readonly turn: number;
  readonly type: string;
  readonly message: string;
}

/**
 * BattleLogger - 战斗日志器
 */
export class BattleLogger {
  private entries: LogEntry[] = [];
  private currentTurn: number = 0;
  private level: LogLevel;

  constructor(level: LogLevel = 'full') {
    this.level = level;
  }

  // ========== 战斗流程日志 ==========

  /**
   * 记录战斗开始
   */
  battleStart(
    teamA: Array<{ name: string; hp: number; maxHp: number }>,
    teamB: Array<{ name: string; hp: number; maxHp: number }>
  ): void {
    const teamAStr = teamA.map((u) => `${u.name}`).join(', ');
    const teamBStr = teamB.map((u) => `${u.name}`).join(', ');

    this.log(
      'battle_start',
      `\n${'='.repeat(50)}\n` +
        `             ===  战斗开始  ===\n` +
        `${'='.repeat(50)}\n` +
        `队伍 A: ${teamAStr}\n` +
        `队伍 B: ${teamBStr}\n` +
        `${'='.repeat(50)}`
    );
  }

  /**
   * 记录战斗结束
   */
  battleEnd(
    result: 'teamA_win' | 'teamB_win' | 'draw',
    turnCount: number,
    survivors: Array<{ name: string; hp: number; maxHp: number }>
  ): void {
    const resultText = {
      teamA_win: '队伍 A 胜利!',
      teamB_win: '队伍 B 胜利!',
      draw: '平局',
    }[result];

    const survivorStr =
      survivors.length > 0
        ? survivors.map((u) => `${u.name} (HP: ${u.hp}/${u.maxHp})`).join(', ')
        : '无';

    this.log(
      'battle_end',
      `\n${'='.repeat(50)}\n` +
        `             ===  战斗结束  ===\n` +
        `${'='.repeat(50)}\n` +
        `结果: ${resultText}\n` +
        `总回合数: ${turnCount}\n` +
        `存活者: ${survivorStr}\n` +
        `${'='.repeat(50)}`
    );
  }

  /**
   * 记录回合开始
   */
  turnStart(unitName: string, hp: number, maxHp: number): void {
    this.currentTurn++;
    this.log(
      'turn_start',
      `\n--- 回合 ${this.currentTurn} ---\n` +
        `${unitName} 的回合 (HP: ${hp}/${maxHp})`
    );
  }

  // ========== 行动日志 ==========

  /**
   * 记录移动
   */
  move(unitName: string, from: AxialCoord, to: AxialCoord): void {
    this.log('move', `${unitName} 移动: (${from.q},${from.r}) → (${to.q},${to.r})`);
  }

  /**
   * 记录攻击
   */
  attack(
    attackerName: string,
    targetName: string,
    skillName: string,
    element: Element
  ): void {
    this.log(
      'attack',
      `${attackerName} 使用 "${skillName}" [${this.getElementName(element)}] → ${targetName}`
    );
  }

  /**
   * 记录伤害
   */
  damage(
    attackerName: string,
    targetName: string,
    damage: number,
    options: {
      element: Element;
      effectiveness: EffectivenessLevel;
      isCritical: boolean;
      isSTAB: boolean;
      remainingHp: number;
      maxHp: number;
    }
  ): void {
    const tags: string[] = [];

    // 效果拔群等
    switch (options.effectiveness) {
      case 'super_effective':
        tags.push('效果拔群!');
        break;
      case 'not_very_effective':
        tags.push('效果不佳');
        break;
      case 'immune':
        tags.push('无效');
        break;
    }

    // 暴击
    if (options.isCritical) {
      tags.push('暴击!');
    }

    // STAB
    if (options.isSTAB) {
      tags.push('同属性加成');
    }

    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';

    this.log(
      'damage',
      `  → 造成 ${damage} 点伤害${tagStr}\n` +
        `  → ${targetName} 剩余 HP: ${options.remainingHp}/${options.maxHp}`
    );
  }

  /**
   * 记录死亡
   */
  death(unitName: string, killerName: string): void {
    this.log('death', `  *** ${unitName} 被 ${killerName} 击败! ***`);
  }

  /**
   * 记录跳过
   */
  skip(unitName: string): void {
    this.log('skip', `${unitName} 跳过行动`);
  }

  // ========== 工具方法 ==========

  private getElementName(element: Element): string {
    const names: Record<Element, string> = {
      fire: '火',
      water: '水',
      grass: '草',
      electric: '电',
      ice: '冰',
      rock: '岩',
      ground: '地',
      flying: '飞',
      bug: '虫',
      poison: '毒',
      dark: '暗',
      light: '光',
      steel: '钢',
      dragon: '龙',
    };
    return names[element] ?? element;
  }

  private log(type: string, message: string): void {
    if (this.level === 'none') return;
    if (
      this.level === 'minimal' &&
      !['battle_start', 'battle_end', 'death'].includes(type)
    ) {
      return;
    }

    this.entries.push({
      timestamp: Date.now(),
      turn: this.currentTurn,
      type,
      message,
    });
  }

  // ========== 输出方法 ==========

  /**
   * 获取完整日志文本
   */
  getFullLog(): string {
    return this.entries.map((e) => e.message).join('\n');
  }

  /**
   * 获取日志条目列表
   */
  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  /**
   * 获取当前回合数
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.entries = [];
    this.currentTurn = 0;
  }

  /**
   * 打印日志到控制台
   */
  print(): void {
    // eslint-disable-next-line no-console
    (globalThis as { console?: { log: (msg: string) => void } }).console?.log(this.getFullLog());
  }
}
