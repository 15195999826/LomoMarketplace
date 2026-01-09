/**
 * VisualizerRegistry - Visualizer 注册表
 *
 * 管理所有 Visualizer 的注册和事件分发。
 * 支持多个 Visualizer 协作处理同一事件。
 *
 * @module lib/battle-replay/visualizers/VisualizerRegistry
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type { VisualAction, VisualizerContext } from '../types';
import type { IVisualizer } from './IVisualizer';

/**
 * Visualizer 注册表
 *
 * 设计决策：收集所有匹配的 Visualizer 结果
 * 原因：一个事件可能需要多个 Visualizer 协作
 * 例如：DamageEvent 同时触发 DamageVisualizer（飘字）+ ScreenShakeVisualizer（震屏）
 */
export class VisualizerRegistry {
  private visualizers: IVisualizer[] = [];
  private debugMode: boolean = false;

  /**
   * 注册 Visualizer
   *
   * @param visualizer 要注册的 Visualizer
   */
  register(visualizer: IVisualizer): this {
    this.visualizers.push(visualizer);
    return this;
  }

  /**
   * 批量注册 Visualizer
   *
   * @param visualizers 要注册的 Visualizer 数组
   */
  registerAll(visualizers: IVisualizer[]): this {
    for (const v of visualizers) {
      this.register(v);
    }
    return this;
  }

  /**
   * 启用/禁用调试模式
   *
   * 调试模式下会输出未处理事件的警告
   */
  setDebugMode(enabled: boolean): this {
    this.debugMode = enabled;
    return this;
  }

  /**
   * 翻译事件为视觉动作
   *
   * 遍历所有注册的 Visualizer，收集能处理该事件的所有结果
   *
   * @param event 要翻译的事件
   * @param context 只读上下文
   * @returns 视觉动作数组
   */
  translate(event: GameEventBase, context: VisualizerContext): VisualAction[] {
    const actions: VisualAction[] = [];
    let handled = false;

    for (const visualizer of this.visualizers) {
      if (visualizer.canHandle(event)) {
        handled = true;
        const result = visualizer.translate(event, context);
        actions.push(...result);
      }
    }

    // 调试模式下警告未处理的事件
    if (!handled && this.debugMode) {
      console.warn(
        `[VisualizerRegistry] Unhandled event: ${event.kind}`,
        event
      );
    }

    return actions;
  }

  /**
   * 批量翻译事件
   *
   * @param events 事件数组
   * @param context 只读上下文
   * @returns 视觉动作数组
   */
  translateAll(events: GameEventBase[], context: VisualizerContext): VisualAction[] {
    const actions: VisualAction[] = [];
    for (const event of events) {
      actions.push(...this.translate(event, context));
    }
    return actions;
  }

  /**
   * 获取已注册的 Visualizer 数量
   */
  get count(): number {
    return this.visualizers.length;
  }

  /**
   * 获取所有已注册的 Visualizer 名称
   */
  getRegisteredNames(): string[] {
    return this.visualizers.map(v => v.name);
  }
}

/**
 * 创建新的 VisualizerRegistry 实例
 */
export function createVisualizerRegistry(): VisualizerRegistry {
  return new VisualizerRegistry();
}
