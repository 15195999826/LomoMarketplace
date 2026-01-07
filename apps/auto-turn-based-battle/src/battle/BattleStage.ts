/**
 * 战斗阶段枚举和状态定义
 *
 * 参考 TurnBasedAutoChessInstance 的状态机设计：
 * - Stage: 当前战斗阶段
 * - StageStatus: 阶段执行状态（Enter/Idle/Pending）
 * - WaitSignal: 异步等待信号
 */

/**
 * 战斗阶段
 *
 * 流程: GameStart → NewRound → CharacterGetTurn → BeforeReleaseAbility
 *       → ReleaseAbility → AfterReleaseAbility → CharacterEndTurn → RoundEnd → ...
 *       → GameOver
 */
export enum BattleStage {
  /** 初始状态，未开始 */
  None = 'None',

  /** 游戏开始（初始化、播放开场动画等） */
  GameStart = 'GameStart',

  /** 新回合开始（回合计数、行动队列排序等） */
  NewRound = 'NewRound',

  /** 角色获得行动权 */
  CharacterGetTurn = 'CharacterGetTurn',

  /** 技能释放前（离开控制区检查、借机攻击等） */
  BeforeReleaseAbility = 'BeforeReleaseAbility',

  /** 释放技能/执行行动 */
  ReleaseAbility = 'ReleaseAbility',

  /** 技能释放后（进入控制区检查、后续效果等） */
  AfterReleaseAbility = 'AfterReleaseAbility',

  /** 角色结束行动 */
  CharacterEndTurn = 'CharacterEndTurn',

  /** 回合结束（清理死亡角色、回合结算等） */
  RoundEnd = 'RoundEnd',

  /** 游戏结束 */
  GameOver = 'GameOver',
}

/**
 * 阶段执行状态
 *
 * - Enter: 刚进入该阶段，下一帧执行 onEnter 逻辑
 * - Idle: 空闲状态，等待外部触发或状态机推进
 * - Pending: 等待异步操作完成（表演、动画等）
 */
export enum StageStatus {
  /** 进入阶段，准备执行 onEnter */
  Enter = 'Enter',

  /** 空闲，阶段逻辑已执行完毕 */
  Idle = 'Idle',

  /** 等待中，有未完成的异步信号 */
  Pending = 'Pending',
}

/**
 * 等待信号类型
 *
 * 用于等待异步操作完成，如技能表演、移动动画等
 */
export enum WaitSignal {
  /** 等待技能表演结束 */
  WaitAbilityPerformEnd = 'WaitAbilityPerformEnd',

  /** 等待通用表演结束（移动、特效等） */
  WaitGeneralPerformEnd = 'WaitGeneralPerformEnd',

  /** 等待角色程序动画播放完毕 */
  WaitCharacterAnimationEnd = 'WaitCharacterAnimationEnd',

  /** 等待 AI 决策完成 */
  WaitAIDecisionEnd = 'WaitAIDecisionEnd',
}

/**
 * 战斗结果
 */
export enum BattleResult {
  /** 未决出胜负 */
  None = 'None',

  /** 玩家队伍获胜 */
  Victory = 'Victory',

  /** 玩家队伍失败 */
  Defeat = 'Defeat',

  /** 平局（双方同归于尽） */
  Draw = 'Draw',
}

/**
 * 阶段转换信息
 */
export interface StageTransition {
  /** 来源阶段 */
  from: BattleStage;

  /** 目标阶段 */
  to: BattleStage;

  /** 转换原因（调试用） */
  reason?: string;
}

/**
 * 阶段事件类型
 */
export type StageEventType =
  | 'stage_enter'
  | 'stage_exit'
  | 'signal_start'
  | 'signal_complete'
  | 'stage_transition';

/**
 * 阶段事件数据
 */
export interface StageEvent {
  type: StageEventType;
  stage: BattleStage;
  status: StageStatus;
  signal?: WaitSignal;
  timestamp: number;
}
