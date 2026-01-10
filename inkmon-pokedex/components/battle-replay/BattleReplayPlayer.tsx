/**
 * BattleReplayPlayer - 战斗回放播放器组件
 *
 * 使用 useBattleDirector Hook 实现的简化版本。
 * 组件只负责渲染，所有逻辑由 Hook 处理。
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { IBattleRecord, GameEventBase } from "@inkmon/battle";
import { saveBattleLog } from "@/app/actions/saveBattleLog";
import {
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
  isAttributeChangedEvent,
  isAbilityActivatedEvent,
  isTagChangedEvent,
} from "@inkmon/battle";
import { useBattleDirector } from "@/lib/battle-replay";
import type { ActorRenderState, RenderState } from "@/lib/battle-replay";
import { getReplaySummary } from "./types";
import { BattleStage } from "./BattleStage";
import styles from "./BattleReplayPlayer.module.css";

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
  // 使用新的 Director Hook
  const { state: directorState, controls } = useBattleDirector(replay, {
    initialSpeed: 1,
    autoPlay: false,
  });

  // 事件历史（需要本地维护，因为 Director 只提供当前帧事件）
  const [eventHistory, setEventHistory] = useState<Array<{ frame: number; events: GameEventBase[] }>>([]);
  const eventsListRef = useRef<HTMLDivElement | null>(null);

  const summary = getReplaySummary(replay);

  // 当前帧事件变化时，追加到历史
  useEffect(() => {
    if (directorState.currentEvents.length > 0 && directorState.currentFrame > 0) {
      setEventHistory((prev) => {
        // 避免重复添加同一帧
        if (prev.length > 0 && prev[prev.length - 1].frame === directorState.currentFrame) {
          return prev;
        }
        return [...prev, { frame: directorState.currentFrame, events: directorState.currentEvents }];
      });
    }
  }, [directorState.currentFrame, directorState.currentEvents]);

  // 重置时清空历史
  const handleReset = useCallback(() => {
    controls.reset();
    setEventHistory([]);
  }, [controls]);

  // 事件历史更新时自动滚动到底部
  useEffect(() => {
    if (eventsListRef.current && eventHistory.length > 0) {
      eventsListRef.current.scrollTop = eventsListRef.current.scrollHeight;
    }
  }, [eventHistory.length]);

  // 调整播放速度
  const handleSpeedChange = useCallback(
    (speed: 0.1 | 0.5 | 1 | 2 | 4) => {
      controls.setSpeed(speed);
    },
    [controls],
  );

  // 导出战斗日志
  const handleExportLog = useCallback(async () => {
    const lines: string[] = [];

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

    for (const frameRecord of eventHistory) {
      lines.push(`--- 第 ${frameRecord.frame} 帧 ---`);
      for (const event of frameRecord.events) {
        lines.push(`  ${formatEvent(event)}`);
      }
      lines.push("");
    }

    const logContent = lines.join("\n");
    const result = await saveBattleLog(summary.battleId, logContent);

    if (result.success) {
      alert(`日志已保存到: ${result.filePath}`);
    } else {
      alert(`保存失败: ${result.error}`);
    }
  }, [summary, eventHistory]);

  // 获取事件显示文本
  const formatEvent = (event: GameEventBase): string => {
    // 框架事件
    if (isAttributeChangedEvent(event)) {
      const change = event.newValue - event.oldValue;
      const sign = change > 0 ? '+' : '';
      return `📊 ${event.actorId}.${event.attribute}: ${event.oldValue} → ${event.newValue} (${sign}${change})`;
    }

    if (isAbilityActivatedEvent(event)) {
      return `✨ ${event.actorId} 激活技能: ${event.abilityConfigId}`;
    }

    if (isTagChangedEvent(event)) {
      if (event.newCount > event.oldCount) {
        return `🔖 ${event.actorId} 获得 ${event.tag} (${event.newCount}层)`;
      } else if (event.newCount < event.oldCount) {
        return `🔖 ${event.actorId} 失去 ${event.tag} (剩余${event.newCount}层)`;
      }
      return `🔖 ${event.actorId} ${event.tag}: ${event.oldCount} → ${event.newCount}`;
    }

    // 业务事件
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

    return `📌 ${event.kind}: ${JSON.stringify(event)}`;
  };

  // 从 RenderState 转换为 BattleStage 需要的格式
  const actorsMap = useMemo(() => {
    const map = new Map<string, {
      id: string;
      displayName: string;
      team: "A" | "B";
      hp: number;
      maxHp: number;
      position: { q: number; r: number };
      isAlive: boolean;
      elements: string[];
    }>();

    for (const actor of directorState.renderState.actors) {
      map.set(actor.id, {
        id: actor.id,
        displayName: actor.displayName,
        team: actor.team,
        hp: Math.round(actor.visualHP),
        maxHp: actor.maxHP,
        position: actor.position,
        isAlive: actor.isAlive,
        elements: actor.elements,
      });
    }

    return map;
  }, [directorState.renderState.actors]);

  const progress = directorState.totalFrames > 0
    ? (directorState.currentFrame / directorState.totalFrames) * 100
    : 0;

  // 分离两队数据
  const teamA = directorState.renderState.actors.filter((a) => a.team === "A");
  const teamB = directorState.renderState.actors.filter((a) => a.team === "B");

  // 获取战斗结果
  const battleResult = useMemo(() => {
    for (const frameRecord of eventHistory) {
      for (const event of frameRecord.events) {
        if (isBattleEndEvent(event)) {
          return event.result;
        }
      }
    }
    return null;
  }, [eventHistory]);

  // 获取当前行动的 Actor ID
  const currentActorId = useMemo(() => {
    // 从最近的 turnStart 事件获取
    for (let i = eventHistory.length - 1; i >= 0; i--) {
      for (const event of eventHistory[i].events) {
        if (isTurnStartEvent(event)) {
          return event.actorId;
        }
      }
    }
    return null;
  }, [eventHistory]);

  // 渲染单位卡片
  const renderUnitCard = (actor: ActorRenderState, team: "A" | "B") => (
    <div
      key={actor.id}
      className={`${styles.unitCard} ${!actor.isAlive ? styles.dead : ""} ${currentActorId === actor.id ? styles.active : ""}`}
    >
      <div className={styles.unitHeader}>
        <div className={styles.unitName}>{actor.displayName}</div>
        <div className={styles.unitCoord}>({actor.position.q},{actor.position.r})</div>
      </div>
      <div className={styles.hpBar}>
        <div
          className={styles.hpFill}
          data-team={team}
          style={{ width: `${Math.max(0, Math.min(100, (actor.visualHP / actor.maxHP) * 100))}%` }}
        />
      </div>
      <div className={styles.hpText}>{Math.round(actor.visualHP)} / {actor.maxHP}</div>
    </div>
  );

  return (
    <div className={styles.player}>
      {/* 左侧侧边栏 - 队伍信息 */}
      <div className={styles.sidebar} data-position="left">
        <div className={styles.sidebarHeader}>
          <span>队伍信息</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{directorState.renderState.actors.length} 单位</span>
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
              actors={actorsMap}
              events={directorState.currentEvents as import("./types").InkMonReplayEvent[]}
              mapConfig={replay.configs?.map as import("@lomo/hex-grid").HexMapConfig | undefined}
              interpolatedPositions={directorState.renderState.interpolatedPositions}
              floatingTexts={directorState.renderState.floatingTexts}
              meleeStrikes={directorState.renderState.meleeStrikes}
            />
            {/* 战斗结果浮层 */}
            {battleResult && (
              <div className={styles.battleResultOverlay}>
                <div className={styles.battleResult}>🏆 {battleResult}</div>
              </div>
            )}
          </div>
        )}

        {/* 进度条 */}
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
                onClick={controls.toggle}
                disabled={directorState.isEnded}
                className={`${styles.controlBtn} ${styles.primary} ${directorState.isEnded ? styles.disabled : ''}`}
                title={directorState.isPlaying ? "暂停" : directorState.isEnded ? "已结束" : "播放"}
              >
                {directorState.isPlaying ? (
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
              <span className={styles.frameNow}>{directorState.currentFrame}</span>
              <span className={styles.frameTotal}>/ {directorState.totalFrames} 帧</span>
            </div>
          </div>

          <div className={styles.speedSelector}>
            {([0.1, 0.5, 1, 2, 4] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`${styles.speedBtn} ${directorState.speed === speed ? styles.active : ""}`}
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
                disabled={eventHistory.length === 0}
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
              {eventHistory.length === 0 ? (
                <div className={styles.noEvents} style={{ textAlign: 'center', opacity: 0.3, padding: '20px', fontSize: '0.8rem' }}>
                  无事件
                </div>
              ) : (
                eventHistory.map((frameRecord) => (
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
