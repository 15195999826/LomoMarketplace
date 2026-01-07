/**
 * BattleStage - 战斗舞台组件
 *
 * 渲染六边形战斗地图、单位 Token、伤害飘字等视觉元素
 */

"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { ActorState, InkMonReplayEvent } from "./types";
import {
  HEX_LAYOUT,
  generateHexGrid,
  hexToPixel,
  calculateGridBounds,
} from "@/lib/hex-layout";
import styles from "./BattleStage.module.css";

// ========== Props ==========

export interface BattleStageProps {
  actors: Map<string, ActorState>;
  events: InkMonReplayEvent[];
  mapRadius?: number;
  width?: number;
  height?: number;
}

// 默认尺寸 - 全屏模式
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 700;

// ========== Floating Text Types ==========

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

// ========== Helper Functions ==========

function isDamageEvent(event: unknown): event is {
  kind: "damage";
  damage: number;
  targetActorId: string;
  targetHex?: { q: number; r: number };
} {
  const e = event as { kind: string; [key: string]: unknown };
  return e.kind === "damage";
}

function isHealEvent(event: unknown): event is {
  kind: "heal";
  healAmount: number;
  targetActorId: string;
} {
  const e = event as { kind: string; [key: string]: unknown };
  return e.kind === "heal";
}

// ========== Components ==========

/**
 * 单个单位 Token 组件
 */
function BattleUnit({
  actor,
  pixelPos,
  isActive,
}: {
  actor: ActorState;
  pixelPos: { x: number; y: number };
  isActive: boolean;
}) {
  const displayName = actor.displayName;
  const initials = displayName.slice(0, 2).toUpperCase();
  const hpPercent = (actor.hp / actor.maxHp) * 100;

  // 根据队伍选择颜色
  const teamColor = actor.team === "A" ? "#3b82f6" : "#ef4444";

  return (
    <div
      className={`${styles.battleUnit} ${actor.isAlive ? styles.alive : styles.dead} ${isActive ? styles.active : ""}`}
      style={{
        left: pixelPos.x + HEX_LAYOUT.width / 2,
        top: pixelPos.y + HEX_LAYOUT.height / 2,
        "--team-color": teamColor,
      } as React.CSSProperties}
    >
      {/* 单位头像/标识 */}
      <div className={styles.unitAvatar}>{initials}</div>

      {/* 血条 */}
      <div className={styles.hpBarContainer}>
        <div
          className={styles.hpBarFill}
          style={{
            width: `${hpPercent}%`,
            backgroundColor:
              hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#eab308" : "#ef4444",
          }}
        />
      </div>

      {/* 名字 */}
      <div className={styles.unitName}>{displayName}</div>

      {/* 队伍标识 */}
      <div
        className={styles.teamIndicator}
        style={{ backgroundColor: teamColor }}
      >
        {actor.team}
      </div>
    </div>
  );
}

/**
 * 伤害飘字组件
 */
function FloatingTexts({
  texts,
  onComplete,
}: {
  texts: FloatingText[];
  onComplete: (id: string) => void;
}) {
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    texts.forEach((text) => {
      const timer = setTimeout(() => {
        onComplete(text.id);
      }, 1000); // 1秒后消失
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [texts, onComplete]);

  return (
    <div className={styles.floatingTextsContainer}>
      {texts.map((text) => (
        <div
          key={text.id}
          className={styles.floatingText}
          style={{
            left: text.x,
            top: text.y,
            color: text.color,
          }}
        >
          {text.text}
        </div>
      ))}
    </div>
  );
}

// ========== Main Component ==========

export function BattleStage({
  actors,
  events,
  mapRadius = 4,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: BattleStageProps) {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // 生成网格坐标
  const hexGrid = useMemo(() => generateHexGrid(mapRadius), [mapRadius]);

  // 计算网格边界
  const gridBounds = useMemo(
    () => calculateGridBounds(hexGrid),
    [hexGrid]
  );

  // 处理事件生成飘字
  useEffect(() => {
    if (events.length === 0) return;

    const newTexts: FloatingText[] = [];

    for (const event of events) {
      // 处理伤害事件
      if (isDamageEvent(event)) {
        const targetActor = actors.get(event.targetActorId);
        if (targetActor && targetActor.isAlive) {
          const pixel = hexToPixel(
            targetActor.position.q,
            targetActor.position.r
          );
          // 居中偏移
          const centerX = pixel.x + HEX_LAYOUT.width / 2 - gridBounds.minX + (width - gridBounds.width) / 2;
          const centerY = pixel.y + HEX_LAYOUT.height / 2 - gridBounds.minY + (height - gridBounds.height) / 2;

          newTexts.push({
            id: `${event.targetActorId}-${Date.now()}-${Math.random()}`,
            text: `-${event.damage}`,
            x: centerX,
            y: centerY - 30,
            color: "#ff4444",
            timestamp: Date.now(),
          });
        }
      }

      // 处理治疗事件
      if (isHealEvent(event)) {
        const targetActor = actors.get(event.targetActorId);
        if (targetActor && targetActor.isAlive) {
          const pixel = hexToPixel(
            targetActor.position.q,
            targetActor.position.r
          );
          const centerX = pixel.x + HEX_LAYOUT.width / 2 - gridBounds.minX + (width - gridBounds.width) / 2;
          const centerY = pixel.y + HEX_LAYOUT.height / 2 - gridBounds.minY + (height - gridBounds.height) / 2;

          newTexts.push({
            id: `${event.targetActorId}-${Date.now()}-${Math.random()}`,
            text: `+${event.healAmount}`,
            x: centerX,
            y: centerY - 30,
            color: "#22c55e",
            timestamp: Date.now(),
          });
        }
      }
    }

    if (newTexts.length > 0) {
      setFloatingTexts((prev) => [...prev, ...newTexts]);
    }
  }, [events, actors, gridBounds, width, height]);

  // 清理完成的飘字
  const handleFloatingTextComplete = useCallback((id: string) => {
    setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 渲染网格
  const renderGrid = () => {
    return hexGrid.map((hex) => {
      const pixel = hexToPixel(hex.q, hex.r);
      // 居中偏移
      const x = pixel.x - gridBounds.minX + (width - gridBounds.width) / 2;
      const y = pixel.y - gridBounds.minY + (height - gridBounds.height) / 2;

      return (
        <div
          key={`${hex.q},${hex.r}`}
          className={styles.hexagon}
          style={{
            left: x,
            top: y,
            width: HEX_LAYOUT.width,
            height: HEX_LAYOUT.height,
          }}
        >
          <div className={styles.hexagonInner} />
          <div className={styles.hexagonCoords}>
            {hex.q},{hex.r}
          </div>
        </div>
      );
    });
  };

  // 渲染单位
  const renderUnits = () => {
    const unitElements: React.ReactNode[] = [];
    const now = Date.now();

    for (const [id, actor] of actors) {
      if (!actor.isAlive) continue; // 死亡单位不渲染

      const pixel = hexToPixel(actor.position.q, actor.position.r);
      const x = pixel.x - gridBounds.minX + (width - gridBounds.width) / 2;
      const y = pixel.y - gridBounds.minY + (height - gridBounds.height) / 2;

      unitElements.push(
        <BattleUnit
          key={id}
          actor={actor}
          pixelPos={{ x, y }}
          isActive={false}
        />
      );
    }

    return unitElements;
  };

  return (
    <div
      className={styles.stageContainer}
      style={{ width, height }}
    >
      {/* 网格层 */}
      <div className={styles.gridLayer}>{renderGrid()}</div>

      {/* 单位层 - 使用 CSS transition 实现平滑移动 */}
      <div className={styles.unitLayer}>{renderUnits()}</div>

      {/* 飘字层 */}
      <FloatingTexts
        texts={floatingTexts}
        onComplete={handleFloatingTextComplete}
      />
    </div>
  );
}
