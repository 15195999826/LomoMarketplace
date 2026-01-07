/**
 * 战斗回放录制器
 *
 * 记录战斗的完整过程，包括：
 * - 初始状态（单位、位置、属性）
 * - 指令序列（每个决策的完整信息）
 * - 事件流（用于回放表演）
 * - 统计数据（伤害、治疗、击杀等）
 *
 * ## 使用示例
 *
 * ```typescript
 * const recorder = new BattleReplayRecorder({
 *   battleId: 'battle-001',
 *   seed: 12345,
 * });
 *
 * // 开始录制
 * recorder.startRecording(units, config);
 *
 * // 记录回合开始
 * recorder.beginRound(roundNumber, actionOrder);
 *
 * // 记录每次行动
 * recorder.recordTurn(unitId, command, events, aiReason, aiScore);
 *
 * // 记录跳过行动
 * recorder.recordSkippedTurn(unitId, reason);
 *
 * // 结束回合
 * recorder.endRound(snapshot);
 *
 * // 停止录制并导出
 * const replay = recorder.stopRecording(result, winnerTeamId);
 * ```
 */

import type { BattleUnit } from "../actors/BattleUnit.js";
import type { BattleCommand } from "../battle/BattleContext.js";
import type { BattleEvent, DamageEvent, HealEvent, DeathEvent, SkillUseEvent } from "../events/BattleEvents.js";
import {
  REPLAY_PROTOCOL_VERSION,
  type IBattleReplay,
  type IReplayMeta,
  type IReplayConfig,
  type IUnitInitData,
  type IRoundData,
  type ITurnData,
  type ICommandRecord,
  type IRoundEndSnapshot,
  type IBattleStatistics,
  type ITeamStatistics,
  type IUnitStatistics,
  type IAttributeSnapshot,
  commandToRecord,
} from "./ReplayTypes.js";

// ========== 配置接口 ==========

/**
 * 录制器配置
 */
export interface IBattleReplayRecorderConfig {
  /** 战斗 ID */
  battleId: string;

  /** 随机数种子 */
  seed: number;

  /** 最大回合数 */
  maxRounds?: number;

  /** tick 间隔（毫秒） */
  tickInterval?: number;

  /** 游戏版本 */
  gameVersion?: string;
}

// ========== 录制器类 ==========

/**
 * 战斗回放录制器
 */
export class BattleReplayRecorder {
  private readonly config: Required<IBattleReplayRecorderConfig>;

  // 录制状态
  private _isRecording = false;
  private _recordedAt = 0;
  private _logicTime = 0;

  // 数据
  private _initialUnits: IUnitInitData[] = [];
  private _rounds: IRoundData[] = [];
  private _currentRound: IRoundData | null = null;
  private _currentTurnEvents: BattleEvent[] = [];

  // 统计
  private _statistics: IBattleStatistics = this.createEmptyStatistics();

  constructor(config: IBattleReplayRecorderConfig) {
    this.config = {
      battleId: config.battleId,
      seed: config.seed,
      maxRounds: config.maxRounds ?? 100,
      tickInterval: config.tickInterval ?? 100,
      gameVersion: config.gameVersion ?? "1.0.0",
    };
  }

  // ========== 属性访问 ==========

  get isRecording(): boolean {
    return this._isRecording;
  }

  get currentRoundNumber(): number {
    return this._currentRound?.roundNumber ?? 0;
  }

  get statistics(): Readonly<IBattleStatistics> {
    return this._statistics;
  }

  get seed(): number {
    return this.config.seed;
  }

  // ========== 录制控制 ==========

  /**
   * 开始录制
   *
   * @param units 初始单位列表
   */
  startRecording(units: BattleUnit[]): void {
    if (this._isRecording) {
      throw new Error("[BattleReplayRecorder] Already recording");
    }

    this._isRecording = true;
    this._recordedAt = Date.now();
    this._logicTime = 0;
    this._rounds = [];
    this._currentRound = null;
    this._currentTurnEvents = [];
    this._statistics = this.createEmptyStatistics();

    // 捕获初始状态
    this._initialUnits = units.map((unit) => this.captureUnitInitData(unit));

    // 初始化单位统计
    for (const unit of units) {
      this._statistics.unitStats[unit.id] = this.createEmptyUnitStats(unit.id);

      // 初始化队伍统计
      if (!this._statistics.teamStats[unit.teamId]) {
        this._statistics.teamStats[unit.teamId] = this.createEmptyTeamStats();
      }
    }
  }

  /**
   * 开始新回合
   *
   * @param roundNumber 回合号
   * @param actionOrder 行动顺序（单位 ID 列表）
   */
  beginRound(roundNumber: number, actionOrder: string[]): void {
    if (!this._isRecording) return;

    // 保存上一回合
    if (this._currentRound) {
      this._rounds.push(this._currentRound);
    }

    // 创建新回合
    this._currentRound = {
      roundNumber,
      actionOrder: [...actionOrder],
      turns: [],
    };
  }

  /**
   * 记录一次行动
   *
   * @param unitId 行动单位 ID
   * @param command 执行的指令
   * @param events 产生的事件
   * @param aiReason AI 决策原因
   * @param aiScore AI 决策评分
   */
  recordTurn(
    unitId: string,
    command: BattleCommand,
    events: BattleEvent[],
    aiReason?: string,
    aiScore?: number,
  ): void {
    if (!this._isRecording || !this._currentRound) return;

    // 计算行动序号
    const actionIndex = this._currentRound.turns.filter(
      (t) => t.unitId === unitId,
    ).length;

    // 创建指令记录
    const commandRecord = commandToRecord(
      command,
      this._logicTime,
      aiReason,
      aiScore,
    );

    // 创建行动记录
    const turn: ITurnData = {
      unitId,
      actionIndex,
      skipped: false,
      command: commandRecord,
      events: [...events],
    };

    this._currentRound.turns.push(turn);

    // 更新统计
    this.updateStatistics(events);
  }

  /**
   * 记录跳过的行动
   *
   * @param unitId 单位 ID
   * @param reason 跳过原因
   */
  recordSkippedTurn(unitId: string, reason: string): void {
    if (!this._isRecording || !this._currentRound) return;

    const actionIndex = this._currentRound.turns.filter(
      (t) => t.unitId === unitId,
    ).length;

    const turn: ITurnData = {
      unitId,
      actionIndex,
      skipped: true,
      skipReason: reason,
      events: [],
    };

    this._currentRound.turns.push(turn);
  }

  /**
   * 记录事件（用于收集当前行动的事件）
   */
  recordEvent(event: BattleEvent): void {
    if (!this._isRecording) return;
    this._currentTurnEvents.push(event);
  }

  /**
   * 刷新事件缓冲（返回并清空收集的事件）
   */
  flushEvents(): BattleEvent[] {
    const events = this._currentTurnEvents;
    this._currentTurnEvents = [];
    return events;
  }

  /**
   * 结束当前回合
   *
   * @param units 当前所有单位（用于生成快照）
   */
  endRound(units: BattleUnit[]): void {
    if (!this._isRecording || !this._currentRound) return;

    // 生成回合结束快照
    this._currentRound.endSnapshot = this.createRoundEndSnapshot(units);
  }

  /**
   * 更新逻辑时间
   *
   * @param dt 时间增量（毫秒）
   */
  updateLogicTime(dt: number): void {
    this._logicTime += dt;
  }

  /**
   * 停止录制
   *
   * @param result 战斗结果
   * @param winnerTeamId 获胜队伍 ID
   * @returns 完整的战斗回放数据
   */
  stopRecording(
    result: "Victory" | "Defeat" | "Draw" | "Unknown",
    winnerTeamId: number,
  ): IBattleReplay {
    if (!this._isRecording) {
      throw new Error("[BattleReplayRecorder] Not recording");
    }

    // 保存最后一个回合
    if (this._currentRound) {
      this._rounds.push(this._currentRound);
    }

    this._isRecording = false;

    // 构建元数据
    const meta: IReplayMeta = {
      battleId: this.config.battleId,
      recordedAt: this._recordedAt,
      gameVersion: this.config.gameVersion,
      totalRounds: this._rounds.length,
      result,
      winnerTeamId,
      duration: this._logicTime,
    };

    // 构建配置
    const config: IReplayConfig = {
      seed: this.config.seed,
      maxRounds: this.config.maxRounds,
      tickInterval: this.config.tickInterval,
    };

    // 返回完整回放数据
    return {
      version: REPLAY_PROTOCOL_VERSION,
      meta,
      config,
      initialUnits: this._initialUnits,
      rounds: this._rounds,
      statistics: this._statistics,
    };
  }

  /**
   * 导出为 JSON 字符串
   *
   * @param result 战斗结果
   * @param winnerTeamId 获胜队伍 ID
   * @param pretty 是否格式化
   */
  exportJSON(
    result: "Victory" | "Defeat" | "Draw" | "Unknown",
    winnerTeamId: number,
    pretty = true,
  ): string {
    const replay = this.stopRecording(result, winnerTeamId);
    return JSON.stringify(replay, null, pretty ? 2 : undefined);
  }

  // ========== 内部方法 ==========

  /**
   * 捕获单位初始数据
   */
  private captureUnitInitData(unit: BattleUnit): IUnitInitData {
    const stats = unit.getStats();

    return {
      id: unit.id,
      unitClass: unit.unitClass,
      displayName: unit.displayName,
      teamId: unit.teamId,
      position: { ...unit.gridPosition },
      attributes: {
        hp: stats.hp,
        maxHp: stats.maxHp,
        atk: stats.atk,
        def: stats.def,
        speed: stats.speed,
        actionPoint: stats.actionPoint,
        maxActionPoint: stats.maxActionPoint,
        stamina: stats.stamina,
        maxStamina: stats.maxStamina,
        critRate: stats.critRate,
        critDamage: stats.critDamage,
        moveRange: stats.moveRange,
        attackRange: stats.attackRange,
      },
    };
  }

  /**
   * 创建回合结束快照
   */
  private createRoundEndSnapshot(units: BattleUnit[]): IRoundEndSnapshot {
    const unitHp: Record<string, number> = {};
    const aliveUnits: string[] = [];

    for (const unit of units) {
      unitHp[unit.id] = unit.hp;
      if (!unit.isDead && unit.hp > 0) {
        aliveUnits.push(unit.id);
      }
    }

    return { unitHp, aliveUnits };
  }

  /**
   * 更新统计数据
   */
  private updateStatistics(events: BattleEvent[]): void {
    for (const event of events) {
      switch (event.kind) {
        case "battle.damage": {
          const dmgEvent = event as DamageEvent;
          this._statistics.totalDamage += dmgEvent.damage;
          if (dmgEvent.isCrit) {
            this._statistics.critCount++;
          }

          // 更新单位统计
          const sourceStats = this._statistics.unitStats[dmgEvent.sourceId];
          const targetStats = this._statistics.unitStats[dmgEvent.targetId];
          if (sourceStats) {
            sourceStats.damageDealt += dmgEvent.damage;
            if (dmgEvent.damage > sourceStats.maxDamage) {
              sourceStats.maxDamage = dmgEvent.damage;
            }
          }
          if (targetStats) {
            targetStats.damageTaken += dmgEvent.damage;
          }

          // 更新队伍统计（需要找到单位的队伍）
          this.updateTeamDamage(dmgEvent.sourceId, dmgEvent.targetId, dmgEvent.damage);
          break;
        }

        case "battle.heal": {
          const healEvent = event as HealEvent;
          this._statistics.totalHealing += healEvent.amount;

          const healerStats = this._statistics.unitStats[healEvent.sourceId];
          if (healerStats) {
            healerStats.healingDone += healEvent.amount;
          }

          // 更新队伍治疗统计
          this.updateTeamHealing(healEvent.sourceId, healEvent.amount);
          break;
        }

        case "battle.death": {
          const deathEvent = event as DeathEvent;
          this._statistics.killCount++;

          const deadStats = this._statistics.unitStats[deathEvent.unitId];
          if (deadStats) {
            deadStats.survived = false;
          }

          if (deathEvent.killerId) {
            const killerStats = this._statistics.unitStats[deathEvent.killerId];
            if (killerStats) {
              killerStats.kills++;
            }
            this.updateTeamKills(deathEvent.killerId, deathEvent.unitId);
          }
          break;
        }

        case "battle.skillUse": {
          const skillEvent = event as SkillUseEvent;
          const userStats = this._statistics.unitStats[skillEvent.unitId];
          if (userStats) {
            const skillId = skillEvent.skillType;
            userStats.skillUsed[skillId] = (userStats.skillUsed[skillId] ?? 0) + 1;
          }
          break;
        }
      }
    }
  }

  /**
   * 更新队伍伤害统计
   */
  private updateTeamDamage(sourceId: string, targetId: string, damage: number): void {
    // 从初始单位数据中查找队伍
    const sourceUnit = this._initialUnits.find((u) => u.id === sourceId);
    const targetUnit = this._initialUnits.find((u) => u.id === targetId);

    if (sourceUnit) {
      const teamStats = this._statistics.teamStats[sourceUnit.teamId];
      if (teamStats) {
        teamStats.damageDealt += damage;
      }
    }

    if (targetUnit) {
      const teamStats = this._statistics.teamStats[targetUnit.teamId];
      if (teamStats) {
        teamStats.damageTaken += damage;
      }
    }
  }

  /**
   * 更新队伍治疗统计
   */
  private updateTeamHealing(sourceId: string, amount: number): void {
    const sourceUnit = this._initialUnits.find((u) => u.id === sourceId);
    if (sourceUnit) {
      const teamStats = this._statistics.teamStats[sourceUnit.teamId];
      if (teamStats) {
        teamStats.healingDone += amount;
      }
    }
  }

  /**
   * 更新队伍击杀统计
   */
  private updateTeamKills(killerId: string, deadId: string): void {
    const killerUnit = this._initialUnits.find((u) => u.id === killerId);
    const deadUnit = this._initialUnits.find((u) => u.id === deadId);

    if (killerUnit) {
      const teamStats = this._statistics.teamStats[killerUnit.teamId];
      if (teamStats) {
        teamStats.kills++;
      }
    }

    if (deadUnit) {
      const teamStats = this._statistics.teamStats[deadUnit.teamId];
      if (teamStats) {
        teamStats.deaths++;
      }
    }
  }

  /**
   * 创建空的统计数据
   */
  private createEmptyStatistics(): IBattleStatistics {
    return {
      totalDamage: 0,
      totalHealing: 0,
      critCount: 0,
      killCount: 0,
      teamStats: {},
      unitStats: {},
    };
  }

  /**
   * 创建空的队伍统计
   */
  private createEmptyTeamStats(): ITeamStatistics {
    return {
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
      deaths: 0,
    };
  }

  /**
   * 创建空的单位统计
   */
  private createEmptyUnitStats(unitId: string): IUnitStatistics {
    return {
      unitId,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
      survived: true,
      maxDamage: 0,
      skillUsed: {},
    };
  }
}

/**
 * 创建战斗回放录制器
 */
export function createBattleReplayRecorder(
  config: IBattleReplayRecorderConfig,
): BattleReplayRecorder {
  return new BattleReplayRecorder(config);
}
