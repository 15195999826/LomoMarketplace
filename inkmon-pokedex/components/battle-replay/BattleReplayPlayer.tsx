/**
 * BattleReplayPlayer - 战斗回放播放器组件
 *
 * MVP 功能：
 * - 播放控制：Play/Pause、Step、Speed
 * - 进度控制：当前 frame、可拖动到任意 frame
 * - 信息面板：当前帧 events、所有 actor 状态
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IBattleRecord, GameEventBase } from "@inkmon/battle";
import {
  isMoveEvent,
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
import type { ReplayPlayerState } from "./types";
import { createInitialState, getReplaySummary } from "./types";
import { stepForward, resetToInitial } from "./battleReplayReducer";
import { BattleStage } from "./BattleStage";
import styles from "./BattleReplayPlayer.module.css";

// ========== Props ==========

interface BattleReplayPlayerProps {
  replay: IBattleRecord;
  log?: string;
  /** 是否显示 BattleStage 地图（默认 true） */
  showBattleStage?: boolean;
}

// ========== Component ==========

export function BattleReplayPlayer({
  replay,
  log,
  showBattleStage = true,
}: BattleReplayPlayerProps) {
  const [state, setState] = useState<ReplayPlayerState>(() =>
    createInitialState(replay),
  );
  const [showLog, setShowLog] = useState(false);
  const [showActorsPanel, setShowActorsPanel] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const summary = getReplaySummary(replay);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 播放/暂停切换
  const togglePlay = useCallback(() => {
    setState((prev) => {
      const newIsPlaying = !prev.isPlaying;

      if (newIsPlaying) {
        // 开始播放
        const interval = replay.meta.tickInterval / prev.speed;
        intervalRef.current = setInterval(() => {
          setState((s) => {
            if (!s.isPlaying) return s;
            const nextState = stepForward(replay, s);
            if (nextState.currentFrameIndex >= replay.timeline.length - 1) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              return { ...nextState, isPlaying: false };
            }
            return nextState;
          });
        }, interval);
      } else {
        // 暂停
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      return { ...prev, isPlaying: newIsPlaying };
    });
  }, [replay]);

  // 重置
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(resetToInitial(replay));
  }, [replay]);

  // 调整播放速度
  const handleSpeedChange = useCallback(
    (speed: 0.5 | 1 | 2 | 4) => {
      setState((prev) => {
        // 如果正在播放，重新设置定时器
        if (prev.isPlaying && intervalRef.current) {
          clearInterval(intervalRef.current);
          const interval = replay.meta.tickInterval / speed;
          intervalRef.current = setInterval(() => {
            setState((s) => {
              if (!s.isPlaying) return s;
              const nextState = stepForward(replay, s);
              if (nextState.currentFrameIndex >= replay.timeline.length - 1) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                return { ...nextState, isPlaying: false };
              }
              return nextState;
            });
          }, interval);
        }
        return { ...prev, speed };
      });
    },
    [replay],
  );

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
      return `🔄 回合 ${event.turnNumber}: ${event.actorId} 行动`;
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
            {([0.5, 1, 2, 4] as const).map((speed) => (
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

        {/* 事件与日志 */}
        <div className={styles.rightContent}>
          <div className={styles.eventsSection}>
            <div className={styles.sidebarHeader} style={{ fontSize: '0.75rem', padding: '8px 16px' }}>
              <span>当前帧事件</span>
            </div>
            <div className={styles.eventsList}>
              {state.currentEvents.length === 0 ? (
                <div className={styles.noEvents} style={{ textAlign: 'center', opacity: 0.3, padding: '20px', fontSize: '0.8rem' }}>
                  无事件
                </div>
              ) : (
                state.currentEvents.map((event, idx) => (
                  <div key={idx} className={styles.eventItem}>{formatEvent(event)}</div>
                ))
              )}
            </div>
          </div>

          {log && (
            <div className={styles.logSection}>
              <div
                className={styles.sidebarHeader}
                style={{ fontSize: '0.75rem', padding: '4px 0', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowLog(!showLog)}
              >
                <span>历史日志</span>
                <span>{showLog ? "▼" : "▶"}</span>
              </div>
              {showLog && <pre className={styles.logContent}>{log}</pre>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
