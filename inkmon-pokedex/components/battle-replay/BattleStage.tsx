/**
 * BattleStage - 战斗舞台组件 (Canvas 版本)
 *
 * 使用 Canvas 绘制六边形战斗地图，避免 CSS clip-path 边框重叠问题
 */

"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { ActorState, InkMonReplayEvent } from "./types";
import { generateHexGrid } from "@/lib/hex-layout";
import styles from "./BattleStage.module.css";

// ========== Constants ==========

// 六边形尺寸配置 (pointy-top)
const HEX_SIZE = 36; // 六边形外接圆半径
const HEX_SPACING = 2; // 六边形间距

// ========== Props ==========

export interface BattleStageProps {
  actors: Map<string, ActorState>;
  events: InkMonReplayEvent[];
  mapRadius?: number;
}

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
} {
  const e = event as { kind: string };
  return e.kind === "damage";
}

function isHealEvent(event: unknown): event is {
  kind: "heal";
  healAmount: number;
  targetActorId: string;
} {
  const e = event as { kind: string };
  return e.kind === "heal";
}

/**
 * Axial 坐标转像素坐标 (pointy-top)
 */
function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

/**
 * 绘制单个六边形 (pointy-top)
 */
function drawHex(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  fillStyle?: string,
  strokeStyle: string = "rgba(255,255,255,0.15)",
  lineWidth: number = 1
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // pointy-top: 从 -30 度开始
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// ========== Main Component ==========

export function BattleStage({
  actors,
  events,
  mapRadius = 4,
}: BattleStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // 生成网格坐标
  const hexGrid = useMemo(() => generateHexGrid(mapRadius), [mapRadius]);


  // ResizeObserver 监听容器大小
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Canvas 绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 计算居中偏移
    const offsetX = canvasSize.width / 2;
    const offsetY = canvasSize.height / 2;

    // 绘制网格
    for (const hex of hexGrid) {
      const pixel = axialToPixel(hex.q, hex.r, HEX_SIZE);
      const x = pixel.x + offsetX;
      const y = pixel.y + offsetY;

      // 绘制六边形
      drawHex(
        ctx,
        x,
        y,
        HEX_SIZE - HEX_SPACING,
        "rgba(255,255,255,0.04)",
        "rgba(255,255,255,0.12)",
        1
      );

      // 绘制坐标文字
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${hex.q},${hex.r}`, x, y);
    }

    // 绘制单位
    for (const [id, actor] of actors) {
      if (!actor.isAlive) continue;

      const pixel = axialToPixel(actor.position.q, actor.position.r, HEX_SIZE);
      const x = pixel.x + offsetX;
      const y = pixel.y + offsetY;

      // 队伍颜色
      const teamColor = actor.team === "A" ? "#22c55e" : "#ef4444";
      const teamBg = actor.team === "A" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";

      // 绘制单位底座
      ctx.beginPath();
      ctx.arc(x, y, HEX_SIZE * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = teamBg;
      ctx.fill();
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制单位名称
      const displayName = actor.displayName.slice(0, 2);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayName, x, y - 4);

      // 绘制血条背景
      const hpBarWidth = HEX_SIZE * 1.2;
      const hpBarHeight = 4;
      const hpBarX = x - hpBarWidth / 2;
      const hpBarY = y + HEX_SIZE * 0.35;

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

      // 绘制血条
      const hpPercent = actor.hp / actor.maxHp;
      const hpColor = hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillStyle = hpColor;
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

      // 绘制队伍标识
      ctx.beginPath();
      ctx.arc(x + HEX_SIZE * 0.4, y - HEX_SIZE * 0.4, 8, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText(actor.team, x + HEX_SIZE * 0.4, y - HEX_SIZE * 0.4);
    }
  }, [hexGrid, actors, canvasSize]);

  // 处理事件生成飘字
  useEffect(() => {
    if (events.length === 0) return;

    const newTexts: FloatingText[] = [];
    const offsetX = canvasSize.width / 2;
    const offsetY = canvasSize.height / 2;

    for (const event of events) {
      if (isDamageEvent(event)) {
        const targetActor = actors.get(event.targetActorId);
        if (targetActor) {
          const pixel = axialToPixel(targetActor.position.q, targetActor.position.r, HEX_SIZE);
          newTexts.push({
            id: `${event.targetActorId}-${Date.now()}-${Math.random()}`,
            text: `-${event.damage}`,
            x: pixel.x + offsetX,
            y: pixel.y + offsetY - 30,
            color: "#ff4444",
            timestamp: Date.now(),
          });
        }
      }

      if (isHealEvent(event)) {
        const targetActor = actors.get(event.targetActorId);
        if (targetActor) {
          const pixel = axialToPixel(targetActor.position.q, targetActor.position.r, HEX_SIZE);
          newTexts.push({
            id: `${event.targetActorId}-${Date.now()}-${Math.random()}`,
            text: `+${event.healAmount}`,
            x: pixel.x + offsetX,
            y: pixel.y + offsetY - 30,
            color: "#22c55e",
            timestamp: Date.now(),
          });
        }
      }
    }

    if (newTexts.length > 0) {
      setFloatingTexts((prev) => [...prev, ...newTexts]);
    }
  }, [events, actors, canvasSize]);

  // 清理飘字
  const handleFloatingTextComplete = useCallback((id: string) => {
    setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 飘字自动消失
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    floatingTexts.forEach((text) => {
      const timer = setTimeout(() => {
        handleFloatingTextComplete(text.id);
      }, 1000);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [floatingTexts, handleFloatingTextComplete]);

  return (
    <div ref={containerRef} className={styles.stageContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* 飘字层 */}
      <div className={styles.floatingTextsContainer}>
        {floatingTexts.map((text) => (
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
    </div>
  );
}
