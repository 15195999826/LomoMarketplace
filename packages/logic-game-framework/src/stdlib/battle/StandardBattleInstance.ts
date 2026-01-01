/**
 * StandardBattleInstance - 标准战斗实例
 *
 * GameplayInstance 的标准战斗实现，支持回合制和 ATB 两种模式。
 *
 * ## 标准实现说明
 *
 * 这是一个可选的标准实现，项目可以：
 * - 直接使用此实现
 * - 继承此类进行扩展
 * - 基于 core 的 GameplayInstance 基类完全自行实现
 *
 * 如果项目需要自定义的战斗流程、回合管理、或其他高级功能，
 * 建议基于 core 自行实现 GameplayInstance。
 */

import { GameplayInstance } from '../../core/world/GameplayInstance.js';
import type { Actor } from '../../core/entity/Actor.js';
import { StandardAbilitySystem } from '../systems/StandardAbilitySystem.js';
import type { IAction } from '../../core/actions/Action.js';
import { createExecutionContext } from '../../core/actions/ExecutionContext.js';
import type { ActorRef } from '../../core/types/common.js';
import type { GameEventBase } from '../../core/events/GameEvent.js';
import { getLogger } from '../../core/utils/Logger.js';

/**
 * 战斗模式
 */
export type BattleMode = 'turn-based' | 'atb';

/**
 * 战斗结果
 */
export type BattleResult = 'ongoing' | 'teamA_win' | 'teamB_win' | 'draw';

/**
 * 战斗配置
 */
export interface BattleConfig {
  /** 战斗 ID（可选） */
  id?: string;
  /** 战斗模式 */
  mode?: BattleMode;
  /** 最大回合数（0 表示无限制） */
  maxRounds?: number;
}

/**
 * StandardBattleInstance - 标准战斗实例
 */
export class StandardBattleInstance extends GameplayInstance {
  readonly type = 'Battle';

  /** 战斗模式 */
  private mode: BattleMode;

  /** 当前回合数 */
  private currentRound: number = 0;

  /** 最大回合数 */
  private maxRounds: number;

  /** 战斗结果 */
  private _result: BattleResult = 'ongoing';

  /** AbilitySystem 引用 */
  private abilitySystem: StandardAbilitySystem;

  constructor(config: BattleConfig = {}) {
    super(config.id);

    this.mode = config.mode ?? 'turn-based';
    this.maxRounds = config.maxRounds ?? 0;

    // 添加 StandardAbilitySystem
    this.abilitySystem = new StandardAbilitySystem();
    this.addSystem(this.abilitySystem);
  }

  // ========== 属性访问器 ==========

  get round(): number {
    return this.currentRound;
  }

  get result(): BattleResult {
    return this._result;
  }

  get isOngoing(): boolean {
    return this._result === 'ongoing';
  }

  // ========== 队伍管理 ==========

  /**
   * 获取队伍 A 的单位
   */
  getTeamA(): Actor[] {
    return this.actors.filter((a) => a.team === 'A');
  }

  /**
   * 获取队伍 B 的单位
   */
  getTeamB(): Actor[] {
    return this.actors.filter((a) => a.team === 'B');
  }

  /**
   * 获取存活的队伍 A 单位
   */
  getAliveTeamA(): Actor[] {
    return this.getTeamA().filter((u) => u.isActive && !u.isDead);
  }

  /**
   * 获取存活的队伍 B 单位
   */
  getAliveTeamB(): Actor[] {
    return this.getTeamB().filter((u) => u.isActive && !u.isDead);
  }

  // ========== 驱动接口 ==========

  /**
   * 推进逻辑时间（ATB 模式使用）
   */
  advance(dt: number): GameEventBase[] {
    if (!this.isRunning || this._result !== 'ongoing') {
      return [];
    }

    // 使用基础实现
    const events = this.baseAdvance(dt);

    // 检查战斗结束条件
    this.checkBattleEnd();

    return events;
  }

  /**
   * 处理行动（回合制模式使用）
   *
   * @param action 要执行的 Action
   * @param source 效果来源
   * @param target 主目标
   * @param triggerEvent 可选的触发事件，如果不提供则创建默认事件
   */
  processAction(
    action: IAction,
    source: ActorRef,
    target: ActorRef,
    triggerEvent?: GameEventBase
  ): GameEventBase[] {
    if (!this.isRunning || this._result !== 'ongoing') {
      return [];
    }

    // 创建执行上下文
    const ctx = createExecutionContext({
      triggerEvent: triggerEvent ?? { kind: 'directAction', logicTime: this._logicTime },
      gameplayState: this,
      source,
      primaryTarget: target,
      eventCollector: this.eventCollector,
    });

    // 执行 Action
    try {
      const result = action.execute(ctx);

      // Action 执行结果的事件由 Action 内部通过 eventCollector 处理
      // 这里不再需要分发 hook
    } catch (error) {
      getLogger().error('Action execution failed', { error });
      this.eventCollector.emit({
        kind: 'error',
        logicTime: this._logicTime,
        errorType: 'action_failed',
        message: 'Action execution failed',
      });
    }

    // 检查战斗结束条件
    this.checkBattleEnd();

    return this.eventCollector.flush();
  }

  // ========== 回合管理 ==========

  /**
   * 开始新回合
   */
  startRound(): GameEventBase[] {
    this.currentRound++;

    // 广播回合开始事件到所有 AbilitySet
    const allUnits = [...this.getAliveTeamA(), ...this.getAliveTeamB()];
    for (const unit of allUnits) {
      this.broadcastEvent({
        kind: 'turnStart',
        logicTime: this._logicTime,
        roundNumber: this.currentRound,
        activeUnit: unit.toRef(),
      });
    }

    // 发出回合开始事件（给表演层）
    this.eventCollector.emit({
      kind: 'turnStart',
      logicTime: this._logicTime,
      roundNumber: this.currentRound,
    });

    return this.eventCollector.flush();
  }

  /**
   * 结束当前回合
   */
  endRound(): GameEventBase[] {
    // 广播回合结束事件到所有 AbilitySet
    const allUnits = [...this.getAliveTeamA(), ...this.getAliveTeamB()];
    for (const unit of allUnits) {
      this.broadcastEvent({
        kind: 'turnEnd',
        logicTime: this._logicTime,
        roundNumber: this.currentRound,
        unit: unit.toRef(),
      });
    }

    // 检查最大回合数
    if (this.maxRounds > 0 && this.currentRound >= this.maxRounds) {
      this.endBattle('draw');
    }

    return this.eventCollector.flush();
  }

  // ========== 事件广播 ==========

  /**
   * 广播事件到所有 Actor 的 AbilitySet
   *
   * 这里传入 this（StandardBattleInstance）作为 gameplayState，
   * 项目可以重写此方法来传入快照。
   */
  broadcastEvent(event: GameEventBase): void {
    this.abilitySystem.broadcastEvent(event, this.actors, this);
  }

  // ========== 战斗结束 ==========

  /**
   * 检查战斗结束条件
   */
  private checkBattleEnd(): void {
    if (this._result !== 'ongoing') {
      return;
    }

    const aliveA = this.getAliveTeamA();
    const aliveB = this.getAliveTeamB();

    if (aliveA.length === 0 && aliveB.length === 0) {
      this.endBattle('draw');
    } else if (aliveA.length === 0) {
      this.endBattle('teamB_win');
    } else if (aliveB.length === 0) {
      this.endBattle('teamA_win');
    }
  }

  /**
   * 结束战斗
   */
  endBattle(result: BattleResult): void {
    this._result = result;

    // 广播战斗结束事件到所有 AbilitySet
    const participants = this.actors.map((a) => a.toRef());
    this.broadcastEvent({
      kind: 'battleEnd',
      logicTime: this._logicTime,
      battleId: this.id,
      winner: result === 'ongoing' ? undefined : result === 'draw' ? 'draw' : result === 'teamA_win' ? 'teamA' : 'teamB',
      participants,
    });

    // 发出战斗结束事件（给表演层）
    const survivors = [
      ...this.getAliveTeamA().map((u) => u.toRef()),
      ...this.getAliveTeamB().map((u) => u.toRef()),
    ];

    this.eventCollector.emit({
      kind: 'battleEnd',
      logicTime: this._logicTime,
      battleId: this.id,
      winner: result === 'ongoing' ? undefined : result === 'draw' ? 'draw' : result === 'teamA_win' ? 'teamA' : 'teamB',
      survivors,
    });

    this.end();
  }

  // ========== 生命周期 ==========

  protected onStart(): void {
    // 广播战斗开始事件到所有 AbilitySet
    const participants = this.actors.map((a) => a.toRef());
    this.broadcastEvent({
      kind: 'battleStart',
      logicTime: this._logicTime,
      battleId: this.id,
      participants,
    });

    // 发出战斗开始事件（给表演层）
    this.eventCollector.emit({
      kind: 'battleStart',
      logicTime: this._logicTime,
      battleId: this.id,
      participants,
    });
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      ...this.serializeBase(),
      mode: this.mode,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      result: this._result,
    };
  }
}
