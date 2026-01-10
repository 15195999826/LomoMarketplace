/**
 * Config Module - 动画配置模块
 *
 * 提供动画配置的加载、合并和访问功能。
 *
 * @module lib/battle-replay/config
 */

// 从 types 重新导出配置类型和默认值
export {
  type AnimationConfig,
  type MoveAnimationConfig,
  type DamageAnimationConfig,
  type HealAnimationConfig,
  type SkillAnimationConfig,
  DEFAULT_ANIMATION_CONFIG,
  mergeAnimationConfig,
} from '../types/AnimationConfig';

/**
 * 从回放数据中提取动画配置
 *
 * @param replayConfigs 回放数据中的 configs 字段
 * @returns 动画配置（如果存在）
 */
export function extractAnimationConfig(
  replayConfigs?: Record<string, unknown>
): Partial<import('../types/AnimationConfig').AnimationConfig> | undefined {
  if (!replayConfigs) return undefined;

  // 尝试从 replay.configs.animation 读取
  const animConfig = replayConfigs.animation;
  if (animConfig && typeof animConfig === 'object') {
    return animConfig as Partial<import('../types/AnimationConfig').AnimationConfig>;
  }

  return undefined;
}
