/**
 * useAnimationFrame - requestAnimationFrame 封装 Hook
 *
 * 提供稳定的帧循环，自动处理组件卸载时的清理。
 *
 * @module lib/battle-replay/hooks/useAnimationFrame
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * 帧回调函数类型
 *
 * @param deltaMs 距离上一帧的时间（毫秒）
 */
export type FrameCallback = (deltaMs: number) => void;

/**
 * useAnimationFrame Hook
 *
 * 使用 requestAnimationFrame 驱动帧循环
 *
 * @param callback 每帧执行的回调函数
 * @param isRunning 是否运行（false 时暂停循环）
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [isPlaying, setIsPlaying] = useState(false);
 *
 *   useAnimationFrame((deltaMs) => {
 *     // 每帧执行的逻辑
 *     console.log(`Delta: ${deltaMs}ms`);
 *   }, isPlaying);
 *
 *   return <button onClick={() => setIsPlaying(!isPlaying)}>Toggle</button>;
 * }
 * ```
 */
export function useAnimationFrame(
  callback: FrameCallback,
  isRunning: boolean = true
): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const callbackRef = useRef<FrameCallback>(callback);

  // 保持 callback 引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 帧循环
  useEffect(() => {
    if (!isRunning) {
      // 停止时清理
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // 初始化时间戳
    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const deltaMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // 调用回调
      callbackRef.current(deltaMs);

      // 继续循环
      rafRef.current = requestAnimationFrame(loop);
    };

    // 启动循环
    rafRef.current = requestAnimationFrame(loop);

    // 清理函数
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning]);
}

/**
 * useAnimationFrameWithSpeed Hook
 *
 * 带速度控制的帧循环，通过累积时间实现变速
 *
 * @param callback 每帧执行的回调函数
 * @param isRunning 是否运行
 * @param speed 播放速度（1 = 正常速度）
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [isPlaying, setIsPlaying] = useState(false);
 *   const [speed, setSpeed] = useState(1);
 *
 *   useAnimationFrameWithSpeed((deltaMs) => {
 *     // deltaMs 已经乘以 speed
 *     console.log(`Scaled delta: ${deltaMs}ms`);
 *   }, isPlaying, speed);
 *
 *   return (
 *     <div>
 *       <button onClick={() => setIsPlaying(!isPlaying)}>Toggle</button>
 *       <button onClick={() => setSpeed(2)}>2x Speed</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnimationFrameWithSpeed(
  callback: FrameCallback,
  isRunning: boolean = true,
  speed: number = 1
): void {
  const speedRef = useRef(speed);

  // 保持 speed 引用最新
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // 包装回调，应用速度缩放
  const scaledCallback = useCallback((deltaMs: number) => {
    callback(deltaMs * speedRef.current);
  }, [callback]);

  useAnimationFrame(scaledCallback, isRunning);
}
