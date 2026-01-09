/**
 * AnimationConfig - 动画配置类型定义
 *
 * 定义所有动画相关的配置参数，支持运行时调整。
 *
 * @module lib/battle-replay/types/AnimationConfig
 */

import type { EasingFunction } from './VisualAction';

/**
 * 移动动画配置
 */
export interface MoveAnimationConfig {
  /** 移动动画时长（毫秒） */
  duration: number;
  /** 缓动函数 */
  easing: EasingFunction;
}

/**
 * 伤害动画配置
 */
export interface DamageAnimationConfig {
  /** 飘字持续时间（毫秒） */
  floatingTextDuration: number;
  /** 血条动画时长（毫秒） */
  hpBarDuration: number;
  /** 血条动画延迟（毫秒），等待受击特效 */
  hpBarDelay?: number;
  /** 受击特效时长（毫秒） */
  hitVfxDuration?: number;
}

/**
 * 治疗动画配置
 */
export interface HealAnimationConfig {
  /** 飘字持续时间（毫秒） */
  floatingTextDuration: number;
  /** 血条动画时长（毫秒） */
  hpBarDuration: number;
}

/**
 * 技能动画配置
 */
export interface SkillAnimationConfig {
  /** 动画总时长（毫秒） */
  duration: number;
  /** Hit 帧时间点（毫秒），用于触发伤害效果 */
  hitFrame: number;
}

/**
 * 完整动画配置
 */
export interface AnimationConfig {
  /** 移动动画配置 */
  move: MoveAnimationConfig;
  /** 伤害动画配置 */
  damage: DamageAnimationConfig;
  /** 治疗动画配置 */
  heal: HealAnimationConfig;
  /** 技能动画配置（按技能类型索引） */
  skill: {
    /** 普通攻击 */
    basicAttack: SkillAnimationConfig;
    /** 其他技能可按需扩展 */
    [skillType: string]: SkillAnimationConfig;
  };
}

/**
 * 默认动画配置
 *
 * 这些值与当前 types.ts 中的常量保持一致
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  move: {
    duration: 500,
    easing: 'easeInOutQuad',
  },
  damage: {
    floatingTextDuration: 1000,
    hpBarDuration: 300,
    hpBarDelay: 200,
    hitVfxDuration: 300,
  },
  heal: {
    floatingTextDuration: 1000,
    hpBarDuration: 300,
  },
  skill: {
    basicAttack: {
      duration: 1000,
      hitFrame: 500,
    },
  },
};

/**
 * 合并动画配置
 *
 * 将用户配置与默认配置合并，用户配置优先
 *
 * @param base 基础配置
 * @param override 覆盖配置（可选）
 * @returns 合并后的配置
 */
export function mergeAnimationConfig(
  base: AnimationConfig,
  override?: Partial<AnimationConfig>
): AnimationConfig {
  if (!override) return base;

  return {
    move: { ...base.move, ...override.move },
    damage: { ...base.damage, ...override.damage },
    heal: { ...base.heal, ...override.heal },
    skill: {
      ...base.skill,
      ...override.skill,
    },
  };
}
