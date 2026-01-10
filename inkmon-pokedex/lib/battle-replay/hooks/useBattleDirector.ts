/**
 * useBattleDirector - 战斗回放核心调度 Hook
 *
 * 整合 VisualizerRegistry、ActionScheduler、RenderWorld，
 * 提供完整的战斗回放控制能力。
 *
 * @module lib/battle-replay/hooks/useBattleDirector
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import type { IBattleRecord, GameEventBase } from '@inkmon/battle';

import type { RenderState } from '../types/RenderState';
import type { AnimationConfig } from '../types/AnimationConfig';
import { createDefaultRegistry, type VisualizerRegistry } from '../visualizers';
import { ActionScheduler, type IActionScheduler } from '../scheduler';
import { RenderWorld } from '../world';
import { useAnimationFrameWithSpeed } from './useAnimationFrame';

// ========== 常量 ==========

/** 逻辑帧间隔（毫秒） */
const LOGIC_TICK_MS = 100;

// ========== 类型定义 ==========

/**
 * Director 控制接口
 */
export interface DirectorControls {
  /** 开始播放 */
  play: () => void;
  /** 暂停播放 */
  pause: () => void;
  /** 切换播放/暂停 */
  toggle: () => void;
  /** 重置到初始状态 */
  reset: () => void;
  /** 设置播放速度 */
  setSpeed: (speed: number) => void;
}

/**
 * Director 状态
 */
export interface DirectorState {
  /** 渲染状态（供 React 组件消费） */
  renderState: RenderState;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 是否已结束 */
  isEnded: boolean;
  /** 当前逻辑帧号 */
  currentFrame: number;
  /** 总帧数 */
  totalFrames: number;
  /** 当前播放速度 */
  speed: number;
  /** 当前帧的事件 */
  currentEvents: GameEventBase[];
}

/**
 * useBattleDirector 返回值
 */
export interface UseBattleDirectorResult {
  /** Director 状态 */
  state: DirectorState;
  /** 控制接口 */
  controls: DirectorControls;
}

/**
 * useBattleDirector 配置选项
 */
export interface UseBattleDirectorOptions {
  /** 动画配置覆盖 */
  animationConfig?: Partial<AnimationConfig>;
  /** 自定义 Visualizer 注册表 */
  registry?: VisualizerRegistry;
  /** 初始播放速度 */
  initialSpeed?: number;
  /** 是否自动播放 */
  autoPlay?: boolean;
}

// ========== Hook 实现 ==========

/**
 * useBattleDirector Hook
 *
 * 战斗回放的核心调度 Hook，整合所有子系统
 *
 * @param replay 战斗回放数据
 * @param options 配置选项
 * @returns Director 状态和控制接口
 *
 * @example
 * ```tsx
 * function BattleReplayPlayer({ replay }) {
 *   const { state, controls } = useBattleDirector(replay);
 *
 *   return (
 *     <div>
 *       <BattleStage renderState={state.renderState} />
 *       <button onClick={controls.toggle}>
 *         {state.isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <span>Frame: {state.currentFrame} / {state.totalFrames}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBattleDirector(
  replay: IBattleRecord,
  options: UseBattleDirectorOptions = {}
): UseBattleDirectorResult {
  const {
    animationConfig,
    registry: customRegistry,
    initialSpeed = 1,
    autoPlay = false,
  } = options;

  // ========== 核心实例（只初始化一次） ==========

  const registry = useMemo(
    () => customRegistry ?? createDefaultRegistry(),
    [customRegistry]
  );

  const scheduler = useMemo<IActionScheduler>(
    () => new ActionScheduler(),
    []
  );

  const world = useMemo(
    () => new RenderWorld(replay, animationConfig),
    [replay, animationConfig]
  );

  // ========== 状态 ==========

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(initialSpeed);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [renderState, setRenderState] = useState<RenderState>(() => world.getState());
  const [currentEvents, setCurrentEvents] = useState<GameEventBase[]>([]);

  // ========== Refs（避免闭包问题） ==========

  /** 逻辑帧累积时间 */
  const logicAccumulatorRef = useRef(0);

  /** 帧数据 Map（预构建） */
  const frameDataMap = useMemo(() => {
    const map = new Map<number, (typeof replay.timeline)[0]>();
    for (const frame of replay.timeline) {
      map.set(frame.frame, frame);
    }
    return map;
  }, [replay.timeline]);

  // ========== 派生状态 ==========

  const totalFrames = replay.meta.totalFrames;

  // 逻辑帧是否已结束
  const logicEnded = currentFrame >= totalFrames;

  // 是否还有未完成的动画
  const hasActiveAnimations = scheduler.getActionCount() > 0;

  // 真正的结束：逻辑帧结束 且 所有动画播放完毕
  const isEnded = logicEnded && !hasActiveAnimations;

  // ========== 帧循环 ==========

  const tick = useCallback(
    (deltaMs: number) => {
      // 累积时间
      logicAccumulatorRef.current += deltaMs;

      // 检查是否需要推进逻辑帧（只有在逻辑帧未结束时才推进）
      while (logicAccumulatorRef.current >= LOGIC_TICK_MS) {
        logicAccumulatorRef.current -= LOGIC_TICK_MS;

        // 推进逻辑帧
        setCurrentFrame((prev) => {
          const nextFrame = prev + 1;

          // 检查是否已到达最后一帧
          if (nextFrame > totalFrames) {
            // 不要在这里停止播放，让动画继续播放
            return prev;
          }

          // 查找该帧的事件
          const frameData = frameDataMap.get(nextFrame);
          if (frameData) {
            // 翻译事件为动作
            const context = world.asContext();
            for (const event of frameData.events) {
              const actions = registry.translate(event, context);
              scheduler.enqueue(actions);
            }
            setCurrentEvents(frameData.events);
          } else {
            setCurrentEvents([]);
          }

          return nextFrame;
        });
      }

      // 调度器 tick（即使逻辑帧结束，也要继续推进动画）
      const result = scheduler.tick(deltaMs);

      // 应用动作到世界状态
      // 注意：需要同时应用活跃动作和本帧完成的动作
      // completedThisTick 中的动作 progress = 1，需要应用最终状态
      if (result.hasChanges) {
        // 先应用活跃动作
        world.applyActions(result.activeActions);
        // 再应用本帧完成的动作（确保最终状态被应用）
        world.applyActions(result.completedThisTick);
        world.cleanup(Date.now());
        setRenderState(world.getState());
      }

      // 检查是否所有动画都已完成（逻辑帧结束 + 无活跃动画）
      // 注意：这里不能直接用 isEnded，因为它是基于旧的 scheduler 状态
      const stillHasAnimations = scheduler.getActionCount() > 0;
      if (currentFrame >= totalFrames && !stillHasAnimations) {
        setIsPlaying(false);
      }
    },
    [currentFrame, frameDataMap, registry, scheduler, totalFrames, world]
  );

  // 使用带速度的帧循环
  useAnimationFrameWithSpeed(tick, isPlaying && !isEnded, speed);

  // ========== 控制接口 ==========

  const controls = useMemo<DirectorControls>(
    () => ({
      play: () => {
        if (!isEnded) {
          setIsPlaying(true);
        }
      },

      pause: () => {
        setIsPlaying(false);
      },

      toggle: () => {
        if (isEnded) return;
        setIsPlaying((prev) => !prev);
      },

      reset: () => {
        // 停止播放
        setIsPlaying(false);

        // 重置调度器
        scheduler.cancelAll();

        // 重置世界状态
        world.resetTo(replay);

        // 重置帧状态
        setCurrentFrame(0);
        logicAccumulatorRef.current = 0;
        setCurrentEvents([]);
        setRenderState(world.getState());
      },

      setSpeed: (newSpeed: number) => {
        setSpeed(newSpeed);
      },
    }),
    [isEnded, replay, scheduler, world]
  );

  // ========== 返回值 ==========

  const state = useMemo<DirectorState>(
    () => ({
      renderState,
      isPlaying,
      isEnded,
      currentFrame,
      totalFrames,
      speed,
      currentEvents,
    }),
    [renderState, isPlaying, isEnded, currentFrame, totalFrames, speed, currentEvents]
  );

  return { state, controls };
}
