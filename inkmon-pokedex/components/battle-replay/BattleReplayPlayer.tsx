/**
 * BattleReplayPlayer - 战斗回放播放器组件
 *
 * 功能：
 * - 播放控制：Play/Pause、Step、Speed
 * - 进度控制：当前 frame、可拖动到任意 frame
 * - BattleStage：可视化战斗地图（单位移动、伤害飘字）
 * - 信息面板：当前帧 events、actor 状态
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IBattleRecord } from "@inkmon/battle";
import {
  type ReplayPlayerState,
  createInitialState,
  getReplaySummary,
} from "./types";
import {
  stepForward,
  applyToFrameIndex,
  resetToInitial,
} from "./battleReplayReducer";
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

  // 单步前进
  const handleStepForward = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...stepForward(replay, prev), isPlaying: false }));
  }, [replay]);

  // 重置
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(resetToInitial(replay));
  }, [replay]);

  // 跳转到指定帧
  const handleSeek = useCallback(
    (frameIndex: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState({ ...applyToFrameIndex(replay, frameIndex), isPlaying: false });
    },
    [replay],
  );

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

  // 获取事件显示文本
  const formatEvent = (event: unknown): string => {
    const e = event as { kind: string; [key: string]: unknown };
    switch (e.kind) {
      case "battleStart":
        return `🎮 战斗开始`;
      case "battleEnd":
        return `🏆 战斗结束: ${e.result}`;
      case "turnStart":
        return `🔄 回合 ${e.turnNumber}: ${e.actorId} 行动`;
      case "move":
        return `🚶 ${e.actorId} 移动 (${(e.fromHex as {q:number;r:number}).q},${(e.fromHex as {q:number;r:number}).r}) → (${(e.toHex as {q:number;r:number}).q},${(e.toHex as {q:number;r:number}).r})`;
      case "skillUse":
        return `⚔️ ${e.actorId} 使用 ${e.skillName} [${e.element}]`;
      case "damage": {
        const extras: string[] = [];
        if (e.isCritical) extras.push("暴击!");
        if (e.isSTAB) extras.push("STAB");
        if (e.effectiveness === "super_effective") extras.push("效果拔群!");
        if (e.effectiveness === "not_very_effective") extras.push("效果不佳");
        if (e.effectiveness === "immune") extras.push("免疫");
        return `💥 ${e.sourceActorId ?? "???"} → ${e.targetActorId}: ${e.damage} 伤害 ${extras.join(" ")}`;
      }
      case "heal":
        return `💚 ${e.targetActorId} 恢复 ${e.healAmount} HP`;
      case "death":
        return `💀 ${e.actorId} 倒下`;
      case "skip":
        return `⏭️ ${e.actorId} 跳过行动`;
      default:
        return `📌 ${e.kind}: ${JSON.stringify(e)}`;
    }
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

  return (
    <div className={styles.player}>
      {/* 摘要信息 */}
      <div className={styles.summary}>
        <h3>📼 战斗回放</h3>
        <div className={styles.summaryGrid}>
          <span>版本: {summary.version}</span>
          <span>帧数: {summary.frameCount}</span>
          <span>单位: {summary.actorCount}</span>
          <span>间隔: {summary.tickInterval}ms</span>
        </div>
      </div>

      {/* 控制栏 - 简化版 */}
      <div className={styles.controls}>
        <button onClick={handleReset} className={styles.controlBtn} title="重置">
          ↺
        </button>
        <button onClick={togglePlay} className={styles.controlBtnPlay}>
          {state.isPlaying ? "⏸️ 暂停" : "▶️ 播放"}
        </button>

        <span className={styles.frameInfo}>
          {state.currentFrame} / {summary.totalFrames}
        </span>
      </div>

      {/* 进度条 */}
      <div className={styles.progressContainer}>
        <input
          type="range"
          min={0}
          max={replay.timeline.length - 1}
          value={Math.max(0, state.currentFrameIndex)}
          onChange={(e) => handleSeek(parseInt(e.target.value, 10))}
          className={styles.progressSlider}
        />
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 主面板 */}
      <div className={styles.mainPanel}>
        {/* BattleStage 地图 - 视觉核心 */}
        {showBattleStage && (
          <div className={styles.battleStageContainer}>
            <BattleStage
              actors={state.actors}
              events={state.currentEvents as import("./types").InkMonReplayEvent[]}
              width={900}
              height={600}
            />
          </div>
        )}

        {/* 右侧面板 - 事件列表 + 单位状态 */}
        <div className={styles.sidePanel}>
          {/* 事件列表 */}
          <div className={styles.eventsPanel}>
            <h4>📋 当前帧事件</h4>
            <div className={styles.eventsList}>
              {state.currentEvents.length === 0 ? (
                <div className={styles.noEvents}>无事件</div>
              ) : (
                state.currentEvents.map((event, idx) => (
                  <div key={idx} className={styles.eventItem}>
                    {formatEvent(event)}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actor 状态 - 可折叠 */}
          <div className={styles.actorsToggle}>
            <button
              onClick={() => setShowActorsPanel(!showActorsPanel)}
              className={styles.toggleBtn}
            >
              {showActorsPanel ? "📉 收起单位列表" : "📈 展开单位列表"}
            </button>
          </div>

          {showActorsPanel && (
            <div className={styles.actorsPanel}>
              <h4>🎭 单位状态 (回合 {state.turnNumber})</h4>
              <div className={styles.teamsContainer}>
                <div className={styles.teamSection}>
                  <h5 className={styles.teamAHeader}>A 队</h5>
                  {Array.from(state.actors.values())
                    .filter((a) => a.team === "A")
                    .map((actor) => (
                      <div key={actor.id} className={getActorStyle(actor)}>
                        <div className={styles.actorName}>{actor.displayName}</div>
                        <div className={styles.actorHp}>
                          HP: {actor.hp}/{actor.maxHp}
                          <div className={styles.hpBar}>
                            <div
                              className={styles.hpFill}
                              style={{
                                width: `${(actor.hp / actor.maxHp) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className={styles.actorPos}>
                          📍 ({actor.position.q}, {actor.position.r})
                        </div>
                      </div>
                    ))}
                </div>
                <div className={styles.teamSection}>
                  <h5 className={styles.teamBHeader}>B 队</h5>
                  {Array.from(state.actors.values())
                    .filter((a) => a.team === "B")
                    .map((actor) => (
                      <div key={actor.id} className={getActorStyle(actor)}>
                        <div className={styles.actorName}>{actor.displayName}</div>
                        <div className={styles.actorHp}>
                          HP: {actor.hp}/{actor.maxHp}
                          <div className={styles.hpBar}>
                            <div
                              className={styles.hpFill}
                              style={{
                                width: `${(actor.hp / actor.maxHp) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className={styles.actorPos}>
                          📍 ({actor.position.q}, {actor.position.r})
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 战斗结果 */}
      {state.battleResult && (
        <div className={styles.battleResult}>
          🏆 战斗结果: {state.battleResult}
        </div>
      )}

      {/* 日志展开 */}
      {log && (
        <div className={styles.logSection}>
          <button
            onClick={() => setShowLog(!showLog)}
            className={styles.logToggle}
          >
            {showLog ? "📖 收起日志" : "📖 展开日志"}
          </button>
          {showLog && <pre className={styles.logContent}>{log}</pre>}
        </div>
      )}
    </div>
  );
}
