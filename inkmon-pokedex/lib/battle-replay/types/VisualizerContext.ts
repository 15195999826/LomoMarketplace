/**
 * VisualizerContext - Visualizer 的只读上下文接口
 *
 * 设计原则：
 * - 只读查询，不允许修改状态
 * - Visualizer 是纯函数，只返回声明式的 VisualAction
 * - 状态修改由 RenderWorld 统一执行
 *
 * @module lib/battle-replay/types/VisualizerContext
 */

import type { HexCoord, WorldCoord } from './VisualAction';
import type { AnimationConfig } from './AnimationConfig';

/**
 * Visualizer 上下文接口
 *
 * 提供 Visualizer 所需的只读查询能力
 */
export interface VisualizerContext {
  // ========== 角色查询 ==========

  /**
   * 获取角色当前位置（世界坐标）
   * @param actorId 角色 ID
   * @returns 世界坐标，如果角色不存在返回 { x: 0, y: 0 }
   */
  getActorPosition(actorId: string): WorldCoord;

  /**
   * 获取角色当前 HP
   * @param actorId 角色 ID
   * @returns 当前 HP，如果角色不存在返回 0
   */
  getActorHP(actorId: string): number;

  /**
   * 获取角色最大 HP
   * @param actorId 角色 ID
   * @returns 最大 HP，如果角色不存在返回 0
   */
  getActorMaxHP(actorId: string): number;

  /**
   * 检查角色是否存活
   * @param actorId 角色 ID
   * @returns 是否存活
   */
  isActorAlive(actorId: string): boolean;

  /**
   * 获取角色六边形坐标
   * @param actorId 角色 ID
   * @returns 六边形坐标，如果角色不存在返回 { q: 0, r: 0 }
   */
  getActorHexPosition(actorId: string): HexCoord;

  /**
   * 获取角色所属队伍
   * @param actorId 角色 ID
   * @returns 队伍标识 ('A' | 'B')，如果角色不存在返回 'A'
   */
  getActorTeam(actorId: string): 'A' | 'B';

  /**
   * 获取所有角色 ID
   * @returns 所有角色 ID 的数组
   */
  getAllActorIds(): string[];

  // ========== 配置查询 ==========

  /**
   * 获取动画配置
   * @returns 动画配置对象
   */
  getAnimationConfig(): AnimationConfig;

  // ========== 坐标转换 ==========

  /**
   * 将六边形坐标转换为世界坐标
   * @param hex 六边形坐标
   * @returns 世界坐标
   */
  hexToWorld(hex: HexCoord): WorldCoord;
}

/**
 * 创建空的 VisualizerContext（用于测试）
 */
export function createEmptyContext(): VisualizerContext {
  return {
    getActorPosition: () => ({ x: 0, y: 0 }),
    getActorHP: () => 0,
    getActorMaxHP: () => 100,
    isActorAlive: () => false,
    getActorHexPosition: () => ({ q: 0, r: 0 }),
    getActorTeam: () => 'A',
    getAllActorIds: () => [],
    getAnimationConfig: () => ({
      move: { duration: 500, easing: 'easeInOutQuad' },
      damage: { floatingTextDuration: 1000, hpBarDuration: 300 },
      heal: { floatingTextDuration: 1000, hpBarDuration: 300 },
      skill: { basicAttack: { duration: 1000, hitFrame: 500 } },
    }),
    hexToWorld: () => ({ x: 0, y: 0 }),
  };
}
