/**
 * 战斗日志器 - 格式化输出战斗信息
 *
 * 提供结构化的战斗日志输出，支持：
 * - 回合/行动信息
 * - 伤害/治疗事件
 * - 角色死亡
 * - 战斗开始/结束
 */

import type { BattleUnit } from '../actors/BattleUnit.js';
import type { BattleCommand } from '../battle/BattleContext.js';
import { BattleStage, BattleResult } from '../battle/BattleStage.js';

/**
 * 日志等级
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
}

/**
 * 日志配置
 */
export interface BattleLoggerConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 最低日志等级 */
  minLevel: LogLevel;
  /** 是否显示时间戳 */
  showTimestamp: boolean;
  /** 是否显示详细信息 */
  verbose: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: BattleLoggerConfig = {
  enabled: true,
  minLevel: LogLevel.Info,
  showTimestamp: false,
  verbose: true,
};

/**
 * 战斗日志器
 */
export class BattleLogger {
  private config: BattleLoggerConfig;
  private battleId: string;
  private logBuffer: string[] = [];

  constructor(battleId: string, config: Partial<BattleLoggerConfig> = {}) {
    this.battleId = battleId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ========== 配置 ==========

  /**
   * 更新配置
   */
  configure(config: Partial<BattleLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // ========== 核心日志方法 ==========

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.config.enabled || level < this.config.minLevel) {
      return;
    }

    let prefix = '';
    if (this.config.showTimestamp) {
      prefix = `[${new Date().toISOString()}] `;
    }

    const formattedMessage = prefix + message;
    this.logBuffer.push(formattedMessage);

    switch (level) {
      case LogLevel.Debug:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.Info:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.Warning:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.Error:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Debug, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Info, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Warning, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Error, message, ...args);
  }

  // ========== 战斗生命周期 ==========

  /**
   * 战斗开始
   */
  battleStart(teamA: BattleUnit[], teamB: BattleUnit[]): void {
    this.info('');
    this.info('═'.repeat(60));
    this.info(`⚔️  战斗开始 [${this.battleId}]`);
    this.info('═'.repeat(60));
    this.info('');

    // 输出队伍信息
    this.info('🔵 队伍 A:');
    for (const unit of teamA) {
      this.logUnitInfo(unit, '   ');
    }

    this.info('');
    this.info('🔴 队伍 B:');
    for (const unit of teamB) {
      this.logUnitInfo(unit, '   ');
    }

    this.info('');
    this.info('─'.repeat(60));
  }

  /**
   * 输出单位信息
   */
  private logUnitInfo(unit: BattleUnit, indent: string = ''): void {
    const stats = unit.getStats();
    const posStr = `(${unit.gridPosition.x}, ${unit.gridPosition.y})`;
    this.info(
      `${indent}${this.getUnitIcon(unit)} ${unit.displayName} ${posStr} | ` +
        `HP:${stats.hp}/${stats.maxHp} ATK:${stats.atk} DEF:${stats.def} SPD:${stats.speed}`
    );
  }

  /**
   * 战斗结束
   */
  battleEnd(result: BattleResult, winnerTeamId: number, totalRounds: number): void {
    this.info('');
    this.info('═'.repeat(60));

    let resultIcon = '🏁';
    let resultText = '战斗结束';

    switch (result) {
      case BattleResult.Victory:
        resultIcon = '🎉';
        resultText = '胜利！队伍 A 获胜';
        break;
      case BattleResult.Defeat:
        resultIcon = '💀';
        resultText = '失败！队伍 B 获胜';
        break;
      case BattleResult.Draw:
        resultIcon = '🤝';
        resultText = '平局！双方同归于尽';
        break;
    }

    this.info(`${resultIcon} ${resultText}`);
    this.info(`📊 总回合数: ${totalRounds}`);
    this.info('═'.repeat(60));
    this.info('');
  }

  // ========== 回合相关 ==========

  /**
   * 新回合开始
   */
  roundStart(round: number, actionQueue: BattleUnit[]): void {
    this.info('');
    this.info(`┌${'─'.repeat(58)}┐`);
    this.info(`│ 📅 第 ${round} 回合开始${' '.repeat(47 - String(round).length)}│`);
    this.info(`└${'─'.repeat(58)}┘`);

    if (this.config.verbose) {
      this.info('');
      this.info('📋 行动顺序:');
      actionQueue.forEach((unit, index) => {
        const teamIcon = unit.teamId === 0 ? '🔵' : '🔴';
        this.info(`   ${index + 1}. ${teamIcon} ${unit.displayName} (SPD: ${unit.speed})`);
      });
    }
    this.info('');
  }

  /**
   * 回合结束
   */
  roundEnd(round: number, aliveA: number, aliveB: number): void {
    this.info('');
    this.info(`📊 第 ${round} 回合结束 | 存活: 🔵${aliveA} vs 🔴${aliveB}`);
    this.info('─'.repeat(60));
  }

  // ========== 角色行动 ==========

  /**
   * 角色获得行动权
   */
  characterGetTurn(unit: BattleUnit): void {
    this.info('');
    this.info(
      `▶️  ${this.getTeamIcon(unit)} ${unit.displayName} 的回合 ` +
        `(HP: ${unit.hp}/${unit.maxHp}, AP: ${unit.actionPoint}/${unit.maxActionPoint})`
    );
  }

  /**
   * 角色执行行动
   */
  characterAction(unit: BattleUnit, command: BattleCommand, reason: string): void {
    const teamIcon = this.getTeamIcon(unit);

    switch (command.type) {
      case 'ability':
        this.info(`   ${teamIcon} ${unit.displayName} 使用 [${command.abilityId}] - ${reason}`);
        break;
      case 'move':
        if (command.targetPosition) {
          this.info(
            `   ${teamIcon} ${unit.displayName} 移动到 ` +
              `(${command.targetPosition.x}, ${command.targetPosition.y}) - ${reason}`
          );
        }
        break;
      case 'idle':
        this.info(`   ${teamIcon} ${unit.displayName} 待机 - ${reason}`);
        break;
    }
  }

  /**
   * 角色结束行动
   */
  characterEndTurn(unit: BattleUnit): void {
    this.debug(`   ◀️  ${unit.displayName} 结束行动`);
  }

  /**
   * 角色跳过行动（眩晕等）
   */
  characterSkipTurn(unit: BattleUnit, reason: string): void {
    this.info(`   ⏭️  ${this.getTeamIcon(unit)} ${unit.displayName} 跳过行动: ${reason}`);
  }

  // ========== 战斗事件 ==========

  /**
   * 伤害事件
   */
  damage(
    source: BattleUnit,
    target: BattleUnit,
    damage: number,
    isCrit: boolean,
    remainingHp: number
  ): void {
    const critText = isCrit ? ' 💥暴击!' : '';
    this.info(
      `      ${this.getUnitIcon(source)} ${source.displayName} → ` +
        `${this.getUnitIcon(target)} ${target.displayName}: ` +
        `-${damage} HP${critText} (剩余: ${remainingHp})`
    );
  }

  /**
   * 治疗事件
   */
  heal(source: BattleUnit, target: BattleUnit, amount: number, newHp: number): void {
    const selfHeal = source.id === target.id ? '(自我治疗)' : '';
    this.info(
      `      💚 ${source.displayName} → ${target.displayName}: ` +
        `+${amount} HP ${selfHeal} (当前: ${newHp})`
    );
  }

  /**
   * 角色死亡
   */
  death(unit: BattleUnit, killer?: BattleUnit): void {
    const killerText = killer ? ` (被 ${killer.displayName} 击杀)` : '';
    this.info(`      💀 ${this.getTeamIcon(unit)} ${unit.displayName} 阵亡${killerText}`);
  }

  /**
   * 移动完成
   */
  moveComplete(unit: BattleUnit, from: { x: number; y: number }, to: { x: number; y: number }): void {
    this.debug(
      `      👣 ${unit.displayName} 移动: (${from.x}, ${from.y}) → (${to.x}, ${to.y})`
    );
  }

  /**
   * 技能冷却触发
   */
  cooldownTriggered(unit: BattleUnit, skill: string, cooldown: number): void {
    this.debug(`      ⏳ ${unit.displayName} 的 [${skill}] 进入冷却: ${cooldown} 回合`);
  }

  // ========== 阶段变化 ==========

  /**
   * 阶段变化
   */
  stageChange(from: BattleStage, to: BattleStage): void {
    if (this.config.verbose) {
      this.debug(`   📍 阶段: ${from} → ${to}`);
    }
  }

  /**
   * 等待信号
   */
  signalWait(signal: string): void {
    this.debug(`   ⏸️  等待: ${signal}`);
  }

  /**
   * 信号完成
   */
  signalComplete(signal: string): void {
    this.debug(`   ✅ 完成: ${signal}`);
  }

  // ========== 工具方法 ==========

  /**
   * 获取队伍图标
   */
  private getTeamIcon(unit: BattleUnit): string {
    return unit.teamId === 0 ? '🔵' : '🔴';
  }

  /**
   * 获取单位图标
   */
  private getUnitIcon(unit: BattleUnit): string {
    const classIcons: Record<string, string> = {
      Warrior: '🗡️',
      Archer: '🏹',
      Mage: '🔮',
      Priest: '✨',
      Assassin: '🗡️',
      Knight: '🛡️',
    };
    return classIcons[unit.unitClass] ?? '👤';
  }

  // ========== 日志缓冲 ==========

  /**
   * 获取所有日志
   */
  getLogBuffer(): readonly string[] {
    return this.logBuffer;
  }

  /**
   * 清空日志缓冲
   */
  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * 导出日志为字符串
   */
  exportLogs(): string {
    return this.logBuffer.join('\n');
  }
}

/**
 * 创建战斗日志器
 */
export function createBattleLogger(
  battleId: string,
  config?: Partial<BattleLoggerConfig>
): BattleLogger {
  return new BattleLogger(battleId, config);
}
