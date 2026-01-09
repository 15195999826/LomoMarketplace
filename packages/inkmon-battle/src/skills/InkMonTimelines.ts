/**
 * InkMon Timeline Definitions
 *
 * Timeline 描述技能执行的时间轴，定义各个动作点（Tag）的时间。
 * 用于演示层同步动画和逻辑效果。
 *
 * ## 设计说明
 *
 * InkMon 使用简化的 Timeline，主要包含：
 * - 移动（瞬时）
 * - 普通攻击（快速）
 * - 技能攻击（带施法/飞行时间）
 */

import type { TimelineAsset } from '@lomo/logic-game-framework';

// ========== 行动 Timeline ==========

/**
 * 移动 Timeline
 *
 * 两阶段移动：
 * - start (0ms): StartMoveAction - 预订目标格子，创建 MoveStartEvent
 * - execute (250ms): ApplyMoveAction - 实际移动，创建 MoveCompleteEvent
 * - end (500ms): 结束
 */
export const MOVE_TIMELINE: TimelineAsset = {
  id: 'action_move',
  totalDuration: 500,
  tags: {
    start: 0,     // 0ms 时执行 StartMoveAction（立即预订）
    execute: 250, // 250ms 时执行 ApplyMoveAction（实际移动）
    end: 500,
  },
};

/**
 * 跳过行动 Timeline
 */
export const SKIP_TIMELINE: TimelineAsset = {
  id: 'action_skip',
  totalDuration: 200,
  tags: {
    end: 200,
  },
};

// ========== 攻击 Timeline ==========

/**
 * 普通攻击 Timeline
 * - 标准近战攻击
 */
export const BASIC_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_basic_attack',
  totalDuration: 1000,
  tags: {
    hit: 500, // 中点命中
    end: 1000,
  },
};

/**
 * 物理攻击 Timeline
 * - 近战技能（有前摇动作）
 */
export const PHYSICAL_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_physical',
  totalDuration: 1200,
  tags: {
    hit: 700, // 前摇后命中
    end: 1200,
  },
};

/**
 * 特殊攻击 Timeline
 * - 带施法动作的远程/魔法攻击
 */
export const SPECIAL_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_special',
  totalDuration: 1500,
  tags: {
    cast: 400,    // 施法动作
    launch: 800,  // 发射/释放
    hit: 1200,    // 命中
    end: 1500,
  },
};

/**
 * 多段攻击 Timeline
 * - 三连击
 */
export const MULTI_HIT_TIMELINE: TimelineAsset = {
  id: 'skill_multi_hit',
  totalDuration: 1400,
  tags: {
    hit1: 400,
    hit2: 700,
    hit3: 1000,
    end: 1400,
  },
};

// ========== 辅助 Timeline ==========

/**
 * 治疗 Timeline
 */
export const HEAL_TIMELINE: TimelineAsset = {
  id: 'skill_heal',
  totalDuration: 1000,
  tags: {
    heal: 600,
    end: 1000,
  },
};

/**
 * Buff 施加 Timeline
 */
export const BUFF_TIMELINE: TimelineAsset = {
  id: 'skill_buff',
  totalDuration: 800,
  tags: {
    apply: 400,
    end: 800,
  },
};

// ========== Timeline ID 常量 ==========

/** Timeline ID 常量（避免硬编码字符串） */
export const TIMELINE_ID = {
  // 行动
  MOVE: 'action_move',
  SKIP: 'action_skip',
  // 攻击
  BASIC_ATTACK: 'skill_basic_attack',
  PHYSICAL: 'skill_physical',
  SPECIAL: 'skill_special',
  MULTI_HIT: 'skill_multi_hit',
  // 辅助
  HEAL: 'skill_heal',
  BUFF: 'skill_buff',
} as const;

export type TimelineId = (typeof TIMELINE_ID)[keyof typeof TIMELINE_ID];

// ========== 所有 Timeline ==========

/**
 * 所有 Timeline 集合
 */
export const INKMON_TIMELINES: TimelineAsset[] = [
  MOVE_TIMELINE,
  SKIP_TIMELINE,
  BASIC_ATTACK_TIMELINE,
  PHYSICAL_ATTACK_TIMELINE,
  SPECIAL_ATTACK_TIMELINE,
  MULTI_HIT_TIMELINE,
  HEAL_TIMELINE,
  BUFF_TIMELINE,
];
