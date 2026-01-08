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
 * - 快速移动到相邻格子
 */
export const MOVE_TIMELINE: TimelineAsset = {
  id: 'action_move',
  totalDuration: 200,
  tags: {
    execute: 100, // 100ms 时执行移动
    end: 200,
  },
};

/**
 * 跳过行动 Timeline
 */
export const SKIP_TIMELINE: TimelineAsset = {
  id: 'action_skip',
  totalDuration: 100,
  tags: {
    end: 100,
  },
};

// ========== 攻击 Timeline ==========

/**
 * 普通攻击 Timeline
 * - 快速近战攻击
 */
export const BASIC_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_basic_attack',
  totalDuration: 400,
  tags: {
    hit: 200, // 200ms 时命中
    end: 400,
  },
};

/**
 * 物理攻击 Timeline
 * - 标准近战技能
 */
export const PHYSICAL_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_physical',
  totalDuration: 500,
  tags: {
    hit: 300,
    end: 500,
  },
};

/**
 * 特殊攻击 Timeline
 * - 带施法动作的远程/魔法攻击
 */
export const SPECIAL_ATTACK_TIMELINE: TimelineAsset = {
  id: 'skill_special',
  totalDuration: 800,
  tags: {
    cast: 200,   // 施法动作
    launch: 400, // 发射/释放
    hit: 600,    // 命中
    end: 800,
  },
};

/**
 * 多段攻击 Timeline
 * - 快速连击
 */
export const MULTI_HIT_TIMELINE: TimelineAsset = {
  id: 'skill_multi_hit',
  totalDuration: 600,
  tags: {
    hit1: 150,
    hit2: 300,
    hit3: 450,
    end: 600,
  },
};

// ========== 辅助 Timeline ==========

/**
 * 治疗 Timeline
 */
export const HEAL_TIMELINE: TimelineAsset = {
  id: 'skill_heal',
  totalDuration: 500,
  tags: {
    heal: 300,
    end: 500,
  },
};

/**
 * Buff 施加 Timeline
 */
export const BUFF_TIMELINE: TimelineAsset = {
  id: 'skill_buff',
  totalDuration: 400,
  tags: {
    apply: 200,
    end: 400,
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
