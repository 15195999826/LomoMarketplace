/**
 * 回放类型定义
 *
 * 定义战斗回放的标准数据结构，用于：
 * - 录制战斗过程（指令序列 + 事件流）
 * - 复现战斗（通过种子 + 指令序列）
 * - 战斗分析（统计、调试）
 *
 * ## 设计原则
 *
 * 1. **指令溯源**: 初始状态 + 指令序列 + 种子 = 完全复现
 * 2. **事件记录**: 同时记录事件流便于回放表演
 * 3. **自描述性**: 数据足够详细，能完整表达发生了什么
 * 4. **按回合组织**: 指令按回合分组，便于跳转和分析
 */

import type { BattleCommand } from "../battle/BattleContext.js";
import type { BattleEvent } from "../events/BattleEvents.js";
import type { UnitClass } from "../config/UnitConfig.js";

// ========== 协议版本 ==========

/** 协议版本号 */
export const REPLAY_PROTOCOL_VERSION = "1.0";

// ========== 根结构 ==========

/**
 * 战斗回放完整记录
 *
 * 包含战斗的元数据、初始状态、指令历史和事件流。
 */
export interface IBattleReplay {
  /** 协议版本 */
  version: string;

  /** 战斗元数据 */
  meta: IReplayMeta;

  /** 初始配置 */
  config: IReplayConfig;

  /** 初始单位列表 */
  initialUnits: IUnitInitData[];

  /** 回合数据列表 */
  rounds: IRoundData[];

  /** 战斗统计 */
  statistics: IBattleStatistics;
}

/**
 * 回放元数据
 */
export interface IReplayMeta {
  /** 战斗 ID（唯一标识） */
  battleId: string;

  /** 录制时间戳（毫秒） */
  recordedAt: number;

  /** 游戏版本 */
  gameVersion: string;

  /** 总回合数 */
  totalRounds: number;

  /** 战斗结果 */
  result: "Victory" | "Defeat" | "Draw" | "Unknown";

  /** 获胜队伍 ID（-1 表示平局或未结束） */
  winnerTeamId: number;

  /** 战斗持续时间（逻辑时间，毫秒） */
  duration: number;
}

/**
 * 回放配置
 */
export interface IReplayConfig {
  /** 随机数种子（用于复现） */
  seed: number;

  /** 最大回合数 */
  maxRounds: number;

  /** tick 间隔（毫秒） */
  tickInterval: number;
}

// ========== 单位初始数据 ==========

/**
 * 单位初始数据
 *
 * 捕获单位在战斗开始时的完整状态。
 */
export interface IUnitInitData {
  /** 单位 ID */
  id: string;

  /** 单位职业 */
  unitClass: UnitClass;

  /** 显示名称 */
  displayName: string;

  /** 队伍 ID */
  teamId: number;

  /** 初始位置 */
  position: { x: number; y: number };

  /** 属性快照 */
  attributes: IAttributeSnapshot;
}

/**
 * 属性快照
 */
export interface IAttributeSnapshot {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  actionPoint: number;
  maxActionPoint: number;
  stamina: number;
  maxStamina: number;
  critRate: number;
  critDamage: number;
  moveRange: number;
  attackRange: number;
}

// ========== 回合数据 ==========

/**
 * 回合数据
 *
 * 记录一个回合内的所有行动和事件。
 */
export interface IRoundData {
  /** 回合号 */
  roundNumber: number;

  /** 行动顺序（单位 ID 列表） */
  actionOrder: string[];

  /** 该回合的所有行动 */
  turns: ITurnData[];

  /** 回合结束时的状态快照（可选，用于校验） */
  endSnapshot?: IRoundEndSnapshot;
}

/**
 * 单次行动数据
 */
export interface ITurnData {
  /** 行动单位 ID */
  unitId: string;

  /** 行动序号（一个单位可能有多次行动） */
  actionIndex: number;

  /** 是否跳过（眩晕等） */
  skipped: boolean;

  /** 跳过原因 */
  skipReason?: string;

  /** 执行的指令 */
  command?: ICommandRecord;

  /** 该次行动产生的事件 */
  events: BattleEvent[];
}

/**
 * 指令记录
 *
 * 记录 AI 决策的完整信息，便于复现和分析。
 */
export interface ICommandRecord {
  /** 指令类型 */
  type: "ability" | "move" | "idle";

  /** 执行者 ID */
  executorId: string;

  /** 技能/能力 ID */
  abilityId?: string;

  /** 目标单位 ID */
  targetId?: string;

  /** 目标位置 */
  targetPosition?: { x: number; y: number };

  /** AI 决策原因（调试用） */
  aiReason?: string;

  /** AI 决策评分 */
  aiScore?: number;

  /** 逻辑时间戳 */
  logicTime: number;
}

/**
 * 回合结束快照
 *
 * 用于校验回放正确性。
 */
export interface IRoundEndSnapshot {
  /** 各单位的 HP */
  unitHp: Record<string, number>;

  /** 存活单位 ID 列表 */
  aliveUnits: string[];
}

// ========== 战斗统计 ==========

/**
 * 战斗统计数据
 */
export interface IBattleStatistics {
  /** 总伤害 */
  totalDamage: number;

  /** 总治疗 */
  totalHealing: number;

  /** 暴击次数 */
  critCount: number;

  /** 击杀数 */
  killCount: number;

  /** 各队伍统计 */
  teamStats: Record<number, ITeamStatistics>;

  /** 各单位统计 */
  unitStats: Record<string, IUnitStatistics>;
}

/**
 * 队伍统计
 */
export interface ITeamStatistics {
  /** 造成的总伤害 */
  damageDealt: number;

  /** 受到的总伤害 */
  damageTaken: number;

  /** 治疗量 */
  healingDone: number;

  /** 击杀数 */
  kills: number;

  /** 死亡数 */
  deaths: number;
}

/**
 * 单位统计
 */
export interface IUnitStatistics {
  /** 单位 ID */
  unitId: string;

  /** 造成的总伤害 */
  damageDealt: number;

  /** 受到的总伤害 */
  damageTaken: number;

  /** 治疗量 */
  healingDone: number;

  /** 击杀数 */
  kills: number;

  /** 是否存活 */
  survived: boolean;

  /** 最高单次伤害 */
  maxDamage: number;

  /** 使用技能次数 */
  skillUsed: Record<string, number>;
}

// ========== 工具类型 ==========

/**
 * 从 BattleCommand 创建 ICommandRecord
 */
export function commandToRecord(
  command: BattleCommand,
  logicTime: number,
  aiReason?: string,
  aiScore?: number,
): ICommandRecord {
  return {
    type: command.type,
    executorId: command.executorId,
    abilityId: command.abilityId,
    targetId: command.targetId,
    targetPosition: command.targetPosition,
    aiReason,
    aiScore,
    logicTime,
  };
}
