/**
 * BattleInstance - 战斗实例
 *
 * GameplayInstance 的标准战斗实现
 * 支持回合制和 ATB 两种模式
 */

import { GameplayInstance } from '../../core/world/GameplayInstance.js';
import type { Actor } from '../../core/entity/Actor.js';
import type { BattleEvent } from '../../core/events/BattleEvent.js';
import { EventTypes } from '../../core/events/BattleEvent.js';
import { AbilitySystem, createHookContext, HookNames } from '../../core/abilities/AbilitySystem.js';
import type { IAction } from '../../core/actions/Action.js';
import { createExecutionContext, type ExecutionContext } from '../../core/actions/ExecutionContext.js';
import type { ActorRef, HookContext } from '../../core/types/common.js';
import type { BattleUnit } from './BattleUnit.js';
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
 * BattleInstance
 */
export class BattleInstance extends GameplayInstance {
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
  private abilitySystem: AbilitySystem;

  constructor(config: BattleConfig = {}) {
    super(config.id);

    this.mode = config.mode ?? 'turn-based';
    this.maxRounds = config.maxRounds ?? 0;

    // 添加 AbilitySystem
    this.abilitySystem = new AbilitySystem();
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
  getTeamA(): BattleUnit[] {
    return this.actors.filter((a) => a.team === 'A') as BattleUnit[];
  }

  /**
   * 获取队伍 B 的单位
   */
  getTeamB(): BattleUnit[] {
    return this.actors.filter((a) => a.team === 'B') as BattleUnit[];
  }

  /**
   * 获取存活的队伍 A 单位
   */
  getAliveTeamA(): BattleUnit[] {
    return this.getTeamA().filter((u) => u.isActive && !u.isDead);
  }

  /**
   * 获取存活的队伍 B 单位
   */
  getAliveTeamB(): BattleUnit[] {
    return this.getTeamB().filter((u) => u.isActive && !u.isDead);
  }

  // ========== 驱动接口 ==========

  /**
   * 推进逻辑时间（ATB 模式使用）
   */
  advance(dt: number): BattleEvent[] {
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
   */
  processAction(action: IAction, source: ActorRef, target: ActorRef): BattleEvent[] {
    if (!this.isRunning || this._result !== 'ongoing') {
      return [];
    }

    // 创建执行上下文
    const ctx = createExecutionContext({
      battle: this,
      source,
      primaryTarget: target,
      logicTime: this._logicTime,
      eventCollector: this.eventCollector,
    });

    // 执行 Action
    try {
      const result = action.execute(ctx);

      // 分发钩子
      if (result.success && result.affectedTargets.length > 0) {
        for (const trigger of result.callbackTriggers) {
          this.dispatchHook(trigger, {
            hookName: trigger,
            relatedActors: [source, ...result.affectedTargets],
            data: result.data ?? {},
          });
        }
      }
    } catch (error) {
      getLogger().error('Action execution failed', { error });
      this.eventCollector.emitError('action_failed', 'Action execution failed');
    }

    // 检查战斗结束条件
    this.checkBattleEnd();

    return this.eventCollector.flush();
  }

  // ========== 回合管理 ==========

  /**
   * 开始新回合
   */
  startRound(): BattleEvent[] {
    this.currentRound++;

    // 分发回合开始钩子
    const allUnits = [...this.getAliveTeamA(), ...this.getAliveTeamB()];
    for (const unit of allUnits) {
      this.dispatchHook(HookNames.ON_TURN_START, {
        hookName: HookNames.ON_TURN_START,
        relatedActors: [unit.toRef()],
        data: { roundNumber: this.currentRound },
      });
    }

    // 发出回合开始事件
    this.eventCollector.emit(EventTypes.TURN_START, {
      roundNumber: this.currentRound,
    });

    return this.eventCollector.flush();
  }

  /**
   * 结束当前回合
   */
  endRound(): BattleEvent[] {
    // 分发回合结束钩子
    const allUnits = [...this.getAliveTeamA(), ...this.getAliveTeamB()];
    for (const unit of allUnits) {
      this.dispatchHook(HookNames.ON_TURN_END, {
        hookName: HookNames.ON_TURN_END,
        relatedActors: [unit.toRef()],
        data: { roundNumber: this.currentRound },
      });
    }

    // 检查最大回合数
    if (this.maxRounds > 0 && this.currentRound >= this.maxRounds) {
      this.endBattle('draw');
    }

    return this.eventCollector.flush();
  }

  // ========== 钩子分发 ==========

  /**
   * 分发钩子到所有相关 Actor
   */
  dispatchHook(hookName: string, context: HookContext): void {
    this.abilitySystem.dispatchHook(hookName, context, this.actors);
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

    // 分发战斗结束钩子
    this.dispatchHook(HookNames.ON_BATTLE_END, {
      hookName: HookNames.ON_BATTLE_END,
      relatedActors: this.actors.map((a) => a.toRef()),
      data: { result },
    });

    // 发出战斗结束事件
    const survivors = [
      ...this.getAliveTeamA().map((u) => u.toRef()),
      ...this.getAliveTeamB().map((u) => u.toRef()),
    ];

    this.eventCollector.emit(EventTypes.BATTLE_END, {
      battleId: this.id,
      winner: result === 'ongoing' ? undefined : result === 'draw' ? 'draw' : result === 'teamA_win' ? 'teamA' : 'teamB',
      survivors,
    });

    this.end();
  }

  // ========== 生命周期 ==========

  protected onStart(): void {
    // 分发战斗开始钩子
    this.dispatchHook(HookNames.ON_BATTLE_START, {
      hookName: HookNames.ON_BATTLE_START,
      relatedActors: this.actors.map((a) => a.toRef()),
      data: { battleId: this.id },
    });

    // 发出战斗开始事件
    this.eventCollector.emit(EventTypes.BATTLE_START, {
      battleId: this.id,
      participants: this.actors.map((a) => a.toRef()),
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
