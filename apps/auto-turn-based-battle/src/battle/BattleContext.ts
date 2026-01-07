/**
 * 战斗上下文 - 存储战斗状态数据
 *
 * 参考 FTurnBasedBattleContext 设计，包含：
 * - 角色状态跟踪（存活/死亡）
 * - 队伍管理
 * - 行动队列
 * - 回合计数
 * - 临时状态缓存
 */

import type { BattleResult } from './BattleStage.js';

/**
 * 角色引用（轻量级）
 */
export interface CharacterRef {
  id: string;
}

/**
 * AI 决策命令
 */
export interface BattleCommand {
  /** 命令类型 */
  type: 'ability' | 'move' | 'idle';

  /** 执行者 ID */
  executorId: string;

  /** 技能/能力 ID（如果是能力命令） */
  abilityId?: string;

  /** 目标角色 ID（单体技能） */
  targetId?: string;

  /** 目标位置（移动/范围技能） */
  targetPosition?: { x: number; y: number };

  /** 额外数据 */
  customData?: Record<string, unknown>;
}

/**
 * 控制区进入缓存
 * 用于处理借机攻击、控制区触发等
 */
export interface ControlAreaEnterCache {
  /** 是否有效 */
  valid: boolean;

  /** 进入控制区的角色 ID */
  enterCharacterId: string;

  /** 来源位置 */
  sourcePosition: { x: number; y: number };

  /** 目标位置 */
  targetPosition: { x: number; y: number };

  /** 控制区拥有者 ID 列表 */
  controllerCharacterIds: string[];
}

/**
 * 战斗上下文
 */
export class BattleContext {
  // ========== 角色状态 ==========

  /** 所有存活角色 ID 列表 */
  private _allAliveCharacters: string[] = [];

  /** 所有死亡角色 ID 列表 */
  private _allDeadCharacters: string[] = [];

  /** 队伍映射：teamId -> characterIds */
  private _teamMap: Map<number, string[]> = new Map();

  // ========== 回合控制 ==========

  /** 当前回合数（从 1 开始） */
  private _round: number = 0;

  /** 行动队列（按速度排序的角色 ID） */
  private _actionQueue: string[] = [];

  /** 当前行动队列索引（-1 表示回合未开始） */
  private _currentActionIndex: number = -1;

  // ========== 临时状态缓存 ==========

  /** 当前执行的命令 */
  private _currentCommand: BattleCommand | null = null;

  /** 当前行动角色是否处于眩晕状态 */
  private _cachedCurrentCharacterIsStun: boolean = false;

  /** 正在执行技能的角色 ID 集合 */
  private _processingCharacters: Set<string> = new Set();

  /** 眩晕状态角色 ID 集合 */
  private _stunnedCharacterIds: Set<string> = new Set();

  /** 控制区进入缓存 */
  private _controlAreaEnterCache: ControlAreaEnterCache = {
    valid: false,
    enterCharacterId: '',
    sourcePosition: { x: 0, y: 0 },
    targetPosition: { x: 0, y: 0 },
    controllerCharacterIds: [],
  };

  // ========== 战斗结果 ==========

  /** 战斗结果 */
  private _battleResult: BattleResult = 'None' as BattleResult;

  /** 获胜队伍 ID（-1 表示未决出胜负） */
  private _winnerTeamId: number = -1;

  // ========== Getters ==========

  get allAliveCharacters(): readonly string[] {
    return this._allAliveCharacters;
  }

  get allDeadCharacters(): readonly string[] {
    return this._allDeadCharacters;
  }

  get round(): number {
    return this._round;
  }

  get actionQueue(): readonly string[] {
    return this._actionQueue;
  }

  get currentActionIndex(): number {
    return this._currentActionIndex;
  }

  get currentCommand(): BattleCommand | null {
    return this._currentCommand;
  }

  get cachedCurrentCharacterIsStun(): boolean {
    return this._cachedCurrentCharacterIsStun;
  }

  get battleResult(): BattleResult {
    return this._battleResult;
  }

  get winnerTeamId(): number {
    return this._winnerTeamId;
  }

  // ========== 角色管理 ==========

  /**
   * 注册角色到战斗
   */
  registerCharacter(characterId: string, teamId: number): void {
    // 添加到存活列表
    if (!this._allAliveCharacters.includes(characterId)) {
      this._allAliveCharacters.push(characterId);
    }

    // 添加到队伍
    if (!this._teamMap.has(teamId)) {
      this._teamMap.set(teamId, []);
    }
    const team = this._teamMap.get(teamId)!;
    if (!team.includes(characterId)) {
      team.push(characterId);
    }
  }

  /**
   * 处理角色死亡
   */
  handleCharacterDeath(characterId: string): void {
    // 从存活列表移除
    const aliveIndex = this._allAliveCharacters.indexOf(characterId);
    if (aliveIndex !== -1) {
      this._allAliveCharacters.splice(aliveIndex, 1);
    }

    // 添加到死亡列表
    if (!this._allDeadCharacters.includes(characterId)) {
      this._allDeadCharacters.push(characterId);
    }

    // 清理眩晕状态
    this._stunnedCharacterIds.delete(characterId);

    // 从处理中列表移除
    this._processingCharacters.delete(characterId);
  }

  /**
   * 获取指定队伍的存活角色
   */
  getTeamAliveCharacters(teamId: number): string[] {
    const teamMembers = this._teamMap.get(teamId) ?? [];
    return teamMembers.filter((id) => this._allAliveCharacters.includes(id));
  }

  /**
   * 获取所有队伍 ID
   */
  getAllTeamIds(): number[] {
    return Array.from(this._teamMap.keys());
  }

  // ========== 回合控制 ==========

  /**
   * 开始新回合
   */
  startNewRound(): void {
    this._round++;
    this._currentActionIndex = -1;
    this._actionQueue = [];
  }

  /**
   * 设置行动队列
   */
  setActionQueue(queue: string[]): void {
    this._actionQueue = [...queue];
    this._currentActionIndex = -1;
  }

  /**
   * 推进到下一个行动角色
   * @returns 下一个行动角色 ID，如果回合结束则返回 null
   */
  nextActionCharacter(): string | null {
    this._currentActionIndex++;
    if (this._currentActionIndex >= this._actionQueue.length) {
      return null;
    }
    return this._actionQueue[this._currentActionIndex];
  }

  /**
   * 获取当前行动角色 ID
   */
  getCurrentCharacterId(): string | null {
    if (
      this._currentActionIndex < 0 ||
      this._currentActionIndex >= this._actionQueue.length
    ) {
      return null;
    }
    return this._actionQueue[this._currentActionIndex];
  }

  /**
   * 检查是否是回合最后一个角色
   */
  isLastActionInRound(): boolean {
    return this._currentActionIndex >= this._actionQueue.length - 1;
  }

  // ========== 命令管理 ==========

  /**
   * 设置当前命令
   */
  setCurrentCommand(command: BattleCommand): void {
    this._currentCommand = command;
  }

  /**
   * 清除当前命令
   */
  clearCurrentCommand(): void {
    this._currentCommand = null;
  }

  // ========== 状态管理 ==========

  /**
   * 设置眩晕缓存
   */
  setCachedStunState(isStun: boolean): void {
    this._cachedCurrentCharacterIsStun = isStun;
  }

  /**
   * 添加眩晕角色
   */
  addStunnedCharacter(characterId: string): void {
    this._stunnedCharacterIds.add(characterId);
  }

  /**
   * 移除眩晕角色
   */
  removeStunnedCharacter(characterId: string): void {
    this._stunnedCharacterIds.delete(characterId);
  }

  /**
   * 检查角色是否眩晕
   */
  isCharacterStunned(characterId: string): boolean {
    return this._stunnedCharacterIds.has(characterId);
  }

  /**
   * 添加正在处理技能的角色
   */
  addProcessingCharacter(characterId: string): void {
    this._processingCharacters.add(characterId);
  }

  /**
   * 移除正在处理技能的角色
   */
  removeProcessingCharacter(characterId: string): void {
    this._processingCharacters.delete(characterId);
  }

  /**
   * 检查是否有角色正在处理技能
   */
  hasProcessingCharacters(): boolean {
    return this._processingCharacters.size > 0;
  }

  // ========== 控制区缓存 ==========

  /**
   * 设置控制区进入缓存
   */
  setControlAreaEnterCache(cache: Omit<ControlAreaEnterCache, 'valid'>): void {
    this._controlAreaEnterCache = { ...cache, valid: true };
  }

  /**
   * 获取控制区进入缓存
   */
  getControlAreaEnterCache(): ControlAreaEnterCache {
    return this._controlAreaEnterCache;
  }

  /**
   * 重置控制区进入缓存
   */
  resetControlAreaEnterCache(): void {
    this._controlAreaEnterCache = {
      valid: false,
      enterCharacterId: '',
      sourcePosition: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      controllerCharacterIds: [],
    };
  }

  // ========== 战斗结果 ==========

  /**
   * 设置战斗结果
   */
  setBattleResult(result: BattleResult, winnerTeamId: number = -1): void {
    this._battleResult = result;
    this._winnerTeamId = winnerTeamId;
  }

  /**
   * 检查战斗是否结束
   * @returns 如果某队全灭则返回 true
   */
  checkGameOver(): boolean {
    const teamIds = this.getAllTeamIds();

    // 统计每个队伍的存活人数
    const aliveTeams: number[] = [];
    for (const teamId of teamIds) {
      const aliveCount = this.getTeamAliveCharacters(teamId).length;
      if (aliveCount > 0) {
        aliveTeams.push(teamId);
      }
    }

    // 只剩一个队伍存活，游戏结束
    if (aliveTeams.length <= 1) {
      if (aliveTeams.length === 1) {
        // 假设 teamId 0 是玩家队伍
        const winnerId = aliveTeams[0];
        this.setBattleResult(
          winnerId === 0 ? ('Victory' as BattleResult) : ('Defeat' as BattleResult),
          winnerId
        );
      } else {
        // 双方同归于尽
        this.setBattleResult('Draw' as BattleResult);
      }
      return true;
    }

    return false;
  }

  // ========== 重置 ==========

  /**
   * 重置战斗上下文
   */
  reset(): void {
    this._allAliveCharacters = [];
    this._allDeadCharacters = [];
    this._teamMap.clear();
    this._round = 0;
    this._actionQueue = [];
    this._currentActionIndex = -1;
    this._currentCommand = null;
    this._cachedCurrentCharacterIsStun = false;
    this._processingCharacters.clear();
    this._stunnedCharacterIds.clear();
    this.resetControlAreaEnterCache();
    this._battleResult = 'None' as BattleResult;
    this._winnerTeamId = -1;
  }

  // ========== 调试 ==========

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      round: this._round,
      currentActionIndex: this._currentActionIndex,
      actionQueueLength: this._actionQueue.length,
      aliveCount: this._allAliveCharacters.length,
      deadCount: this._allDeadCharacters.length,
      processingCount: this._processingCharacters.size,
      stunnedCount: this._stunnedCharacterIds.size,
      battleResult: this._battleResult,
    };
  }
}
