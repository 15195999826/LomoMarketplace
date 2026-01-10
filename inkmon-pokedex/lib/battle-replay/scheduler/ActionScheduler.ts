/**
 * ActionScheduler - 动作调度器
 *
 * 管理 VisualAction 的生命周期和进度更新。
 * 采用简化的 parallel 模式：所有动作入队后立即并行执行。
 *
 * @module lib/battle-replay/scheduler/ActionScheduler
 */

import type { VisualAction, ActiveAction } from '../types/VisualAction';

// ========== 接口定义 ==========

/**
 * Scheduler tick 结果
 */
export interface SchedulerTickResult {
  /** 当前活跃的动作（带进度） */
  activeActions: ActiveAction[];
  /** 本帧完成的动作 */
  completedThisTick: ActiveAction[];
  /** 是否有变化（用于优化渲染） */
  hasChanges: boolean;
}

/**
 * 动作调度器接口
 */
export interface IActionScheduler {
  /** 添加动作（立即并行执行） */
  enqueue(actions: VisualAction[]): void;

  /** 每帧更新 */
  tick(deltaMs: number): SchedulerTickResult;

  /** 获取当前活跃动作 */
  getActiveActions(): ActiveAction[];

  /** 取消所有动作（用于重置） */
  cancelAll(): void;

  /** 获取当前动作数量 */
  getActionCount(): number;
}

// ========== 实现 ==========

/**
 * ActionScheduler 实现
 *
 * 设计特点：
 * - 所有动作并行执行，无阻塞
 * - 支持 delay 延迟执行
 * - 自动清理已完成的动作
 */
export class ActionScheduler implements IActionScheduler {
  /** 活跃动作 Map（id -> ActiveAction） */
  private active: Map<string, ActiveAction> = new Map();

  /** 动作 ID 计数器 */
  private nextId = 0;

  /**
   * 添加动作到调度器
   *
   * 所有动作立即并行执行（考虑 delay）
   *
   * @param actions 要添加的动作列表
   */
  enqueue(actions: VisualAction[]): void {
    for (const action of actions) {
      const id = `action_${this.nextId++}`;
      const delay = action.delay ?? 0;

      this.active.set(id, {
        id,
        action,
        elapsed: 0,
        progress: 0,
        isDelaying: delay > 0,
      });
    }
  }

  /**
   * 每帧更新
   *
   * 更新所有活跃动作的进度，清理已完成的动作
   *
   * @param deltaMs 距离上一帧的时间（毫秒）
   * @returns tick 结果
   */
  tick(deltaMs: number): SchedulerTickResult {
    const completedThisTick: ActiveAction[] = [];
    let hasChanges = false;

    for (const [id, activeAction] of this.active) {
      const { action } = activeAction;
      const delay = action.delay ?? 0;

      // 更新已执行时间
      activeAction.elapsed += deltaMs;

      // 检查是否还在延迟中
      if (activeAction.elapsed < delay) {
        activeAction.isDelaying = true;
        activeAction.progress = 0;
        hasChanges = true;
        continue;
      }

      // 延迟结束，开始执行
      activeAction.isDelaying = false;

      // 计算实际执行时间（减去延迟）
      const effectiveElapsed = activeAction.elapsed - delay;

      // 计算进度（0~1）
      activeAction.progress = Math.min(1, effectiveElapsed / action.duration);
      hasChanges = true;

      // 检查是否完成
      if (effectiveElapsed >= action.duration) {
        activeAction.progress = 1; // 确保最终进度为 1
        completedThisTick.push({ ...activeAction });
        this.active.delete(id);
      }
    }

    return {
      activeActions: Array.from(this.active.values()),
      completedThisTick,
      hasChanges: hasChanges || completedThisTick.length > 0,
    };
  }

  /**
   * 获取当前活跃动作
   */
  getActiveActions(): ActiveAction[] {
    return Array.from(this.active.values());
  }

  /**
   * 取消所有动作
   *
   * 用于重置播放器状态
   */
  cancelAll(): void {
    this.active.clear();
  }

  /**
   * 获取当前动作数量
   */
  getActionCount(): number {
    return this.active.size;
  }
}

/**
 * 创建 ActionScheduler 实例
 */
export function createActionScheduler(): IActionScheduler {
  return new ActionScheduler();
}
