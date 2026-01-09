/**
 * BattleReplayPlayer - 战斗回放播放器组件
 *
 * ## 时钟系统
 *
 * - 渲染帧：20ms/帧（基准），用于动画插值
 * - 逻辑帧：100ms/帧，用于事件处理
 * - 固定 5 渲染帧 = 1 逻辑帧
 * - 倍速通过调整渲染帧间隔实现：interval = 20ms / speed
 *
 * ## 动画系统
 *
 * - 移动动画：500ms，在 5 个逻辑帧内完成
 * - 攻击动画：1000ms，Hit 帧在 500ms 触发飘字
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { IBattleRecord, GameEventBase } from "@inkmon/battle";
import { saveBattleLog } from "@/app/actions/saveBattleLog";
import {
  isMoveEvent,
  isMoveStartEvent,
  isMoveCompleteEvent,
  isDamageEvent,
  isHealEvent,
  isDeathEvent,
  isTurnStartEvent,
  isBattleStartEvent,
  isBattleEndEvent,
  isSkillUseEvent,
  isSkipEvent,
  // 框架事件 Type Guards
  isAttributeChangedEvent,
  isAbilityActivatedEvent,
  isTagChangedEvent,
} from "@inkmon/battle";
import type { ReplayPlayerState, MoveAnimationData, SkillAnimationData, PendingEffect, FrameEventRecord, AnimationData } from "./types";
import {
  createInitialState,
  getReplaySummary,
  BASE_RENDER_TICK_MS,
  RENDER_FRAMES_PER_LOGIC_FRAME,
  MOVE_DURATION_MS,
  BASIC_ATTACK_DURATION_MS,
  BASIC_ATTACK_HIT_MS,
} from "./types";
import { resetToInitial, applyFrame } from "./battleReplayReducer";
import { BattleStage } from "./BattleStage";
import styles from "./BattleReplayPlayer.module.css";

// ========== 动画辅助函数 ==========

/** 线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 缓动函数：ease-in-out-quad */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ========== Props ==========

interface BattleReplayPlayerProps {
  replay: IBattleRecord;
  /** 是否显示 BattleStage 地图（默认 true） */
  showBattleStage?: boolean;
}

// ========== Component ==========

export function BattleReplayPlayer({
  replay,
  showBattleStage = true,
}: BattleReplayPlayerProps) {
  const [state, setState] = useState<ReplayPlayerState>(() =>
    createInitialState(replay),
  );
  const [showActorsPanel, setShowActorsPanel] = useState(true);
  /** 触发的效果（用于飘字） */
  const [triggeredEffects, setTriggeredEffects] = useState<Array<{
    type: 'damage' | 'heal';
    targetActorId: string;
    value: number;
  }>>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  /** 渲染帧计数器（在逻辑帧内的位置，0-4） */
  const renderFrameInLogicRef = useRef(0);
  /** 事件列表滚动容器 ref */
  const eventsListRef = useRef<HTMLDivElement | null>(null);

  const summary = getReplaySummary(replay);

  // 预构建帧号到帧数据的 Map，提高查找效率
  const frameDataMap = useMemo(() => {
    const map = new Map<number, typeof replay.timeline[0]>();
    for (const frame of replay.timeline) {
      map.set(frame.frame, frame);
    }
    return map;
  }, [replay.timeline]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 事件历史更新时自动滚动到底部
  useEffect(() => {
    if (eventsListRef.current && state.eventHistory.length > 0) {
      eventsListRef.current.scrollTop = eventsListRef.current.scrollHeight;
    }
  }, [state.eventHistory.length]);

  /**
   * 渲染帧 Tick
   * 每 20ms/speed 执行一次，每 5 次推进一个逻辑帧
   */
  const renderTick = useCallback(() => {
    // 收集本次 tick 触发的效果
    const effectsToTrigger: Array<{ type: 'damage' | 'heal'; targetActorId: string; value: number }> = [];

    setState((prev) => {
      if (!prev.isPlaying) return prev;

      let newState = { ...prev };
      const newRenderFrameCount = prev.renderFrameCount + 1;
      newState.renderFrameCount = newRenderFrameCount;

      // 更新动画插值，并收集触发的效果
      const { state: updatedState, effects } = updateAnimationInterpolation(newState);
      newState = updatedState;
      effectsToTrigger.push(...effects);

      // 每 5 渲染帧推进 1 逻辑帧
      renderFrameInLogicRef.current++;
      if (renderFrameInLogicRef.current >= RENDER_FRAMES_PER_LOGIC_FRAME) {
        renderFrameInLogicRef.current = 0;

        // 推进逻辑帧号
        const nextFrame = prev.currentFrame + 1;
        if (nextFrame > replay.meta.totalFrames) {
          // 播放结束
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return { ...newState, isPlaying: false };
        }

        newState.currentFrame = nextFrame;

        // 查找该帧是否有事件（使用预构建的 Map）
        const frameData = frameDataMap.get(nextFrame);
        if (frameData) {
          // 有事件，应用帧数据
          newState = applyFrame(newState, frameData);
          // 检查事件，创建动画
          newState = processEventsForAnimation(newState, frameData.events);
        } else {
          // 无事件，清空当前事件列表
          newState.currentEvents = [];
        }
      }

      return newState;
    });

    // 在 setState 外部触发效果
    if (effectsToTrigger.length > 0) {
      setTriggeredEffects(effectsToTrigger);
    } else {
      // 清空上一帧的效果
      setTriggeredEffects([]);
    }
  }, [replay, frameDataMap]);

  /**
   * 更新所有活跃动画的插值位置
   * 返回更新后的状态和触发的效果
   */
  const updateAnimationInterpolation = (state: ReplayPlayerState): {
    state: ReplayPlayerState;
    effects: Array<{ type: 'damage' | 'heal'; targetActorId: string; value: number }>;
  } => {
    const effects: Array<{ type: 'damage' | 'heal'; targetActorId: string; value: number }> = [];

    if (state.activeAnimations.size === 0) {
      return { state, effects };
    }

    const newActiveAnimations = new Map(state.activeAnimations);
    const interpolatedPositions = new Map(state.interpolatedPositions);
    const completedActorIds: string[] = [];

    // 遍历所有活跃动画
    for (const [actorId, anim] of newActiveAnimations) {
      const elapsedFrames = state.renderFrameCount - anim.startRenderFrame;
      const elapsedMs = elapsedFrames * BASE_RENDER_TICK_MS;
      const progress = Math.min(1, elapsedMs / anim.duration);

      if (anim.type === 'move') {
        // 移动动画插值
        const q = lerp(anim.fromPos.q, anim.toPos.q, easeInOutQuad(progress));
        const r = lerp(anim.fromPos.r, anim.toPos.r, easeInOutQuad(progress));
        interpolatedPositions.set(actorId, { q, r });

        // 动画结束
        if (progress >= 1) {
          completedActorIds.push(actorId);
          interpolatedPositions.delete(actorId);
        }
      } else if (anim.type === 'skill') {
        // 技能动画：检查 Tag 触发
        let updated = false;
        const triggeredTags = new Set(anim.triggeredTags);

        for (const [tagName, tagTime] of Object.entries(anim.tags)) {
          if (elapsedMs >= tagTime && !triggeredTags.has(tagName)) {
            triggeredTags.add(tagName);
            updated = true;
            // 收集该 Tag 对应的效果
            for (const effect of anim.pendingEffects) {
              if (effect.triggerTag === tagName) {
                effects.push({
                  type: effect.type,
                  targetActorId: effect.targetActorId,
                  value: effect.value,
                });
              }
            }
          }
        }

        // 更新 triggeredTags
        if (updated) {
          newActiveAnimations.set(actorId, { ...anim, triggeredTags });
        }

        // 动画结束
        if (progress >= 1) {
          completedActorIds.push(actorId);
        }
      }
    }

    // 移除已完成的动画
    for (const actorId of completedActorIds) {
      newActiveAnimations.delete(actorId);
    }

    return {
      state: {
        ...state,
        activeAnimations: newActiveAnimations,
        interpolatedPositions,
      },
      effects,
    };
  };

  /**
   * 处理事件，创建动画（支持多动画并发）
   */
  const processEventsForAnimation = (
    state: ReplayPlayerState,
    events: GameEventBase[]
  ): ReplayPlayerState => {
    const activeAnimations = new Map(state.activeAnimations);
    const interpolatedPositions = new Map(state.interpolatedPositions);

    for (const event of events) {
      // 移动开始事件 -> 创建移动动画（新版两阶段移动）
      if (isMoveStartEvent(event)) {
        const moveAnim: MoveAnimationData = {
          type: 'move',
          actorId: event.actorId,
          fromPos: { q: event.fromHex.q, r: event.fromHex.r },
          toPos: { q: event.toHex.q, r: event.toHex.r },
          duration: MOVE_DURATION_MS,
          startRenderFrame: state.renderFrameCount,
        };
        activeAnimations.set(event.actorId, moveAnim);
        // 初始化插值位置
        interpolatedPositions.set(event.actorId, { q: event.fromHex.q, r: event.fromHex.r });
      }

      // 移动事件 -> 创建移动动画（旧版兼容）
      if (isMoveEvent(event)) {
        const moveAnim: MoveAnimationData = {
          type: 'move',
          actorId: event.actorId,
          fromPos: { q: event.fromHex.q, r: event.fromHex.r },
          toPos: { q: event.toHex.q, r: event.toHex.r },
          duration: MOVE_DURATION_MS,
          startRenderFrame: state.renderFrameCount,
        };
        activeAnimations.set(event.actorId, moveAnim);
        // 初始化插值位置
        interpolatedPositions.set(event.actorId, { q: event.fromHex.q, r: event.fromHex.r });
      }

      // 技能使用事件 -> 创建技能动画
      if (isSkillUseEvent(event)) {
        // 收集后续的伤害/治疗事件作为待触发效果
        const pendingEffects: PendingEffect[] = [];
        for (const e of events) {
          if (isDamageEvent(e)) {
            pendingEffects.push({
              type: 'damage',
              targetActorId: e.targetActorId,
              value: e.damage,
              triggerTag: 'hit',
            });
          }
          if (isHealEvent(e)) {
            pendingEffects.push({
              type: 'heal',
              targetActorId: e.targetActorId,
              value: e.healAmount,
              triggerTag: 'heal',
            });
          }
        }

        const skillAnim: SkillAnimationData = {
          type: 'skill',
          actorId: event.actorId,
          skillName: event.skillName,
          duration: BASIC_ATTACK_DURATION_MS,
          startRenderFrame: state.renderFrameCount,
          tags: { hit: BASIC_ATTACK_HIT_MS },
          triggeredTags: new Set(),
          pendingEffects,
        };
        activeAnimations.set(event.actorId, skillAnim);
      }
    }

    return {
      ...state,
      activeAnimations,
      interpolatedPositions,
    };
  };

  // 播放/暂停切换
  const togglePlay = useCallback(() => {
    setState((prev) => {
      const newIsPlaying = !prev.isPlaying;

      if (newIsPlaying) {
        // 开始播放：启动渲染帧定时器
        renderFrameInLogicRef.current = 0;
        const interval = BASE_RENDER_TICK_MS / prev.speed;
        intervalRef.current = setInterval(renderTick, interval);
      } else {
        // 暂停
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      return { ...prev, isPlaying: newIsPlaying };
    });
  }, [renderTick]);

  // 重置
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    renderFrameInLogicRef.current = 0;
    setState(resetToInitial(replay));
  }, [replay]);

  // 调整播放速度
  const handleSpeedChange = useCallback(
    (speed: 0.1 | 0.5 | 1 | 2 | 4) => {
      setState((prev) => {
        // 如果正在播放，重新设置定时器
        if (prev.isPlaying && intervalRef.current) {
          clearInterval(intervalRef.current);
          const interval = BASE_RENDER_TICK_MS / speed;
          intervalRef.current = setInterval(renderTick, interval);
        }
        return { ...prev, speed };
      });
    },
    [renderTick],
  );

  // 导出战斗日志
  const handleExportLog = useCallback(async () => {
    // 生成格式化的日志文本
    const lines: string[] = [];

    // 头部信息
    lines.push("=".repeat(50));
    lines.push(`战斗日志 - ${summary.battleId}`);
    lines.push(`导出时间: ${new Date().toLocaleString()}`);
    lines.push(`总帧数: ${summary.totalFrames}`);
    lines.push(`参战单位: ${summary.actorCount}`);
    if (summary.result) {
      lines.push(`战斗结果: ${summary.result}`);
    }
    lines.push("=".repeat(50));
    lines.push("");

    // 事件历史
    for (const frameRecord of state.eventHistory) {
      lines.push(`--- 第 ${frameRecord.frame} 帧 ---`);
      for (const event of frameRecord.events) {
        lines.push(`  ${formatEvent(event)}`);
      }
      lines.push("");
    }

    const logContent = lines.join("\n");

    // 调用 Server Action 保存
    const result = await saveBattleLog(summary.battleId, logContent);

    if (result.success) {
      alert(`日志已保存到: ${result.filePath}`);
    } else {
      alert(`保存失败: ${result.error}`);
    }
  }, [summary, state.eventHistory]);

  // 获取事件显示文本（使用 Type Guards 转换事件类型）
  const formatEvent = (event: GameEventBase): string => {
    // ========== 框架事件 ==========

    // 属性变化
    if (isAttributeChangedEvent(event)) {
      const change = event.newValue - event.oldValue;
      const sign = change > 0 ? '+' : '';
      return `📊 ${event.actorId}.${event.attribute}: ${event.oldValue} → ${event.newValue} (${sign}${change})`;
    }

    // Ability 激活完成
    if (isAbilityActivatedEvent(event)) {
      return `✨ ${event.actorId} 激活技能: ${event.abilityConfigId}`;
    }

    // Tag 变化
    if (isTagChangedEvent(event)) {
      if (event.newCount > event.oldCount) {
        return `🔖 ${event.actorId} 获得 ${event.tag} (${event.newCount}层)`;
      } else if (event.newCount < event.oldCount) {
        return `🔖 ${event.actorId} 失去 ${event.tag} (剩余${event.newCount}层)`;
      }
      return `🔖 ${event.actorId} ${event.tag}: ${event.oldCount} → ${event.newCount}`;
    }

    // ========== 业务事件 ==========

    if (isBattleStartEvent(event)) {
      return `🎮 战斗开始`;
    }

    if (isBattleEndEvent(event)) {
      return `🏆 战斗结束: ${event.result}`;
    }

    if (isTurnStartEvent(event)) {
      return `🔄 第 ${event.turnNumber} 次行动: ${event.actorId}`;
    }

    if (isMoveStartEvent(event)) {
      return `🚶 ${event.actorId} 开始移动 (${event.fromHex.q},${event.fromHex.r}) → (${event.toHex.q},${event.toHex.r})`;
    }

    if (isMoveCompleteEvent(event)) {
      return `✅ ${event.actorId} 到达 (${event.toHex.q},${event.toHex.r})`;
    }

    if (isMoveEvent(event)) {
      return `🚶 ${event.actorId} 移动 (${event.fromHex.q},${event.fromHex.r}) → (${event.toHex.q},${event.toHex.r})`;
    }

    if (isSkillUseEvent(event)) {
      return `⚔️ ${event.actorId} 使用 ${event.skillName} [${event.element}]`;
    }

    if (isDamageEvent(event)) {
      const extras: string[] = [];
      if (event.isCritical) extras.push("暴击!");
      if (event.isSTAB) extras.push("STAB");
      if (event.effectiveness === "super_effective") extras.push("效果拔群!");
      if (event.effectiveness === "not_very_effective") extras.push("效果不佳");
      if (event.effectiveness === "immune") extras.push("免疫");
      return `💥 ${event.sourceActorId ?? "???"} → ${event.targetActorId}: ${event.damage} 伤害 ${extras.join(" ")}`;
    }

    if (isHealEvent(event)) {
      return `💚 ${event.targetActorId} 恢复 ${event.healAmount} HP`;
    }

    if (isDeathEvent(event)) {
      return `💀 ${event.actorId} 倒下`;
    }

    if (isSkipEvent(event)) {
      return `⏭️ ${event.actorId} 跳过行动`;
    }

    // 未知事件类型
    return `📌 ${event.kind}: ${JSON.stringify(event)}`;
  };

  // 获取 Actor 显示样式
  const getActorStyle = (actor: { id: string; team: string; isAlive: boolean }) => {
    let className = styles.actorCard;
    if (actor.team === "A") {
      className += ` ${styles.teamA}`;
    } else {
      className += ` ${styles.teamB}`;
    }
    if (!actor.isAlive) {
      className += ` ${styles.dead}`;
    }
    if (actor.isAlive && state.currentActorId === actor.id) {
      className += ` ${styles.active}`;
    }
    return className;
  };

  const progress =
    replay.timeline.length > 0
      ? ((state.currentFrameIndex + 1) / replay.timeline.length) * 100
      : 0;

  // 分离两队数据
  const teamA = Array.from(state.actors.values()).filter((a) => a.team === "A");
  const teamB = Array.from(state.actors.values()).filter((a) => a.team === "B");

  const isEnded = state.currentFrameIndex >= replay.timeline.length - 1;

  // 渲染单位卡片
  const renderUnitCard = (actor: typeof teamA[0], team: "A" | "B") => (
    <div
      key={actor.id}
      className={`${styles.unitCard} ${!actor.isAlive ? styles.dead : ""} ${state.currentActorId === actor.id ? styles.active : ""}`}
    >
      <div className={styles.unitHeader}>
        <div className={styles.unitName}>{actor.displayName}</div>
        <div className={styles.unitCoord}>({actor.position.q},{actor.position.r})</div>
      </div>
      <div className={styles.hpBar}>
        <div
          className={styles.hpFill}
          data-team={team}
          style={{ width: `${Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100))}%` }}
        />
      </div>
      <div className={styles.hpText}>{actor.hp} / {actor.maxHp}</div>
    </div>
  );

  return (
    <div className={styles.player}>
      {/* 左侧侧边栏 - 队伍信息 */}
      <div className={styles.sidebar} data-position="left">
        <div className={styles.sidebarHeader}>
          <span>队伍信息</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{state.actors.size} 单位</span>
        </div>
        <div className={styles.teamsContainer}>
          {/* A 队 */}
          <div className={styles.teamSection}>
            <div className={styles.teamTitle} data-team="A">A 我方</div>
            <div className={styles.unitList}>
              {teamA.map((actor) => renderUnitCard(actor, "A"))}
            </div>
          </div>
          {/* B 队 */}
          <div className={styles.teamSection}>
            <div className={styles.teamTitle} data-team="B">B 敌方</div>
            <div className={styles.unitList}>
              {teamB.map((actor) => renderUnitCard(actor, "B"))}
            </div>
          </div>
        </div>
      </div>

      {/* 中间核心区域 - 战斗地图 */}
      <div className={styles.mainArea}>
        {showBattleStage && (
          <div className={styles.battleStageWrapper}>
            <BattleStage
              actors={state.actors}
              events={state.currentEvents as import("./types").InkMonReplayEvent[]}
              interpolatedPositions={state.interpolatedPositions}
              triggeredEffects={triggeredEffects}
            />
            {/* 战斗结果浮层移到地图上方 */}
            {state.battleResult && (
              <div className={styles.battleResultOverlay}>
                <div className={styles.battleResult}>🏆 {state.battleResult}</div>
              </div>
            )}
          </div>
        )}

        {/* 进度条移到地图下方 */}
        <div className={styles.progressContainer}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 右侧侧边栏 - 控制与日志 */}
      <div className={styles.sidebar} data-position="right">
        <div className={styles.sidebarHeader}>
          <span>控制面板</span>
        </div>

        {/* 播放控制 */}
        <div className={styles.controlSection}>
          <div className={styles.playbackControls}>
            <div className={styles.mainButtons}>
              <button onClick={handleReset} className={`${styles.controlBtn} ${styles.secondary}`} title="重置">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                onClick={togglePlay}
                disabled={isEnded}
                className={`${styles.controlBtn} ${styles.primary} ${isEnded ? styles.disabled : ''}`}
                title={state.isPlaying ? "暂停" : isEnded ? "已结束" : "播放"}
              >
                {state.isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                )}
              </button>
            </div>
            <div className={styles.frameCounter}>
              <span className={styles.frameNow}>{state.currentFrame}</span>
              <span className={styles.frameTotal}>/ {summary.totalFrames} 帧</span>
            </div>
          </div>

          <div className={styles.speedSelector}>
            {([0.1, 0.5, 1, 2, 4] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`${styles.speedBtn} ${state.speed === speed ? styles.active : ""}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* 事件历史 */}
        <div className={styles.rightContent}>
          <div className={styles.eventsSection}>
            <div className={styles.sidebarHeader} style={{ fontSize: '0.75rem', padding: '8px 16px' }}>
              <span>事件历史</span>
              <button
                className={styles.exportBtn}
                onClick={handleExportLog}
                disabled={state.eventHistory.length === 0}
                title="导出战斗日志"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
            <div className={styles.eventsList} ref={eventsListRef}>
              {state.eventHistory.length === 0 ? (
                <div className={styles.noEvents} style={{ textAlign: 'center', opacity: 0.3, padding: '20px', fontSize: '0.8rem' }}>
                  无事件
                </div>
              ) : (
                state.eventHistory.map((frameRecord, frameIdx) => (
                  <div key={frameRecord.frame} className={styles.frameGroup}>
                    <div className={styles.frameDivider}>
                      <span className={styles.frameDividerLine} />
                      <span className={styles.frameDividerText}>第 {frameRecord.frame} 帧</span>
                      <span className={styles.frameDividerLine} />
                    </div>
                    {frameRecord.events.map((event, eventIdx) => (
                      <div key={eventIdx} className={styles.eventItem}>{formatEvent(event)}</div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
