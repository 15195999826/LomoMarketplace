/**
 * IVisualizer - Visualizer 接口定义
 *
 * Visualizer 负责将逻辑层的 GameEvent 翻译为表现层的 VisualAction。
 * 每个 Visualizer 处理特定类型的事件。
 *
 * @module lib/battle-replay/visualizers/IVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type { VisualAction, VisualizerContext } from '../types';

/**
 * Visualizer 接口
 *
 * @template TEvent 处理的事件类型
 */
export interface IVisualizer<TEvent extends GameEventBase = GameEventBase> {
  /**
   * Visualizer 名称（用于调试）
   */
  readonly name: string;

  /**
   * 检查是否能处理该事件
   *
   * @param event 待检查的事件
   * @returns 类型守卫，如果返回 true 则 event 被收窄为 TEvent
   */
  canHandle(event: GameEventBase): event is TEvent;

  /**
   * 将事件翻译为视觉动作
   *
   * 设计原则：
   * - 纯函数，无副作用
   * - 只读取 context，不修改状态
   * - 返回声明式的 VisualAction 数组
   *
   * @param event 要翻译的事件
   * @param context 只读上下文
   * @returns 视觉动作数组（可以为空）
   */
  translate(event: TEvent, context: VisualizerContext): VisualAction[];
}

/**
 * 创建简单 Visualizer 的工厂函数
 *
 * 用于快速创建只处理单一事件类型的 Visualizer
 *
 * @param name Visualizer 名称
 * @param canHandle 类型守卫函数
 * @param translate 翻译函数
 */
export function createVisualizer<TEvent extends GameEventBase>(
  name: string,
  canHandle: (event: GameEventBase) => event is TEvent,
  translate: (event: TEvent, context: VisualizerContext) => VisualAction[]
): IVisualizer<TEvent> {
  return {
    name,
    canHandle,
    translate,
  };
}
