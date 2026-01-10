/**
 * Visualizers 模块导出
 *
 * @module lib/battle-replay/visualizers
 */

// 接口和注册表
export type { IVisualizer } from './IVisualizer';
export { createVisualizer } from './IVisualizer';
export { VisualizerRegistry, createVisualizerRegistry } from './VisualizerRegistry';

// 具体实现
export {
  MoveVisualizer,
  createMoveVisualizer,
  DamageVisualizer,
  createDamageVisualizer,
  SkillVisualizer,
  createSkillVisualizer,
  HealVisualizer,
  createHealVisualizer,
  DeathVisualizer,
  createDeathVisualizer,
} from './impl';

// ========== 默认注册表工厂 ==========

import { VisualizerRegistry } from './VisualizerRegistry';
import {
  createMoveVisualizer,
  createDamageVisualizer,
  createSkillVisualizer,
  createHealVisualizer,
  createDeathVisualizer,
} from './impl';

/**
 * 创建包含所有默认 Visualizer 的注册表
 *
 * 包含：
 * - MoveVisualizer
 * - DamageVisualizer
 * - SkillVisualizer
 * - HealVisualizer
 * - DeathVisualizer
 */
export function createDefaultRegistry(): VisualizerRegistry {
  return new VisualizerRegistry()
    .register(createMoveVisualizer())
    .register(createDamageVisualizer())
    .register(createSkillVisualizer())
    .register(createHealVisualizer())
    .register(createDeathVisualizer());
}
