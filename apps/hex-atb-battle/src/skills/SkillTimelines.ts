/**
 * 技能 Timeline 定义
 *
 * Timeline 描述技能执行的时间轴，定义各个动作点（Tag）的时间。
 */

import type { TimelineAsset } from '@lomo/logic-game-framework';

/**
 * 横扫斩 Timeline
 * - 近战攻击，0.3s 时命中
 */
export const SLASH_TIMELINE: TimelineAsset = {
  id: 'skill_slash',
  totalDuration: 500,
  tags: {
    hit: 300, // 300ms 时造成伤害
    end: 500,
  },
};

/**
 * 精准射击 Timeline
 * - 远程攻击，0.5s 时命中
 */
export const PRECISE_SHOT_TIMELINE: TimelineAsset = {
  id: 'skill_precise_shot',
  totalDuration: 800,
  tags: {
    hit: 500,
    end: 800,
  },
};

/**
 * 火球术 Timeline
 * - 远程魔法，0.8s 时命中
 */
export const FIREBALL_TIMELINE: TimelineAsset = {
  id: 'skill_fireball',
  totalDuration: 1200,
  tags: {
    cast: 200,  // 施法动作
    hit: 800,   // 命中
    end: 1200,
  },
};

/**
 * 毁灭重击 Timeline
 * - 近战重击，0.6s 时命中
 */
export const CRUSHING_BLOW_TIMELINE: TimelineAsset = {
  id: 'skill_crushing_blow',
  totalDuration: 1000,
  tags: {
    windup: 300, // 蓄力
    hit: 600,    // 命中
    end: 1000,
  },
};

/**
 * 疾风连刺 Timeline
 * - 快速近战，多段伤害
 */
export const SWIFT_STRIKE_TIMELINE: TimelineAsset = {
  id: 'skill_swift_strike',
  totalDuration: 400,
  tags: {
    hit1: 100, // 第一击
    hit2: 200, // 第二击
    hit3: 300, // 第三击
    end: 400,
  },
};

/**
 * 圣光治愈 Timeline
 * - 远程治疗，0.4s 时生效
 */
export const HOLY_HEAL_TIMELINE: TimelineAsset = {
  id: 'skill_holy_heal',
  totalDuration: 600,
  tags: {
    heal: 400, // 治疗生效
    end: 600,
  },
};

/**
 * 移动 Timeline
 * - 移动到相邻格子，0.2s 完成
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
 * 所有 Timeline
 */
export const SKILL_TIMELINES: TimelineAsset[] = [
  MOVE_TIMELINE,
  SLASH_TIMELINE,
  PRECISE_SHOT_TIMELINE,
  FIREBALL_TIMELINE,
  CRUSHING_BLOW_TIMELINE,
  SWIFT_STRIKE_TIMELINE,
  HOLY_HEAL_TIMELINE,
];
