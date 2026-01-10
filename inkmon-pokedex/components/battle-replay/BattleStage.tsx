/**
 * BattleStage - 战斗舞台组件 (Canvas 版本)
 *
 * 使用 Canvas 绘制六边形战斗地图，避免 CSS clip-path 边框重叠问题
 * 直接使用 HexGridModel 进行坐标计算，与逻辑层保持一致
 */

"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { HexGridModel, type HexMapConfig, type PixelCoord } from "@lomo/hex-grid";
import type { ActorState, InkMonReplayEvent } from "./types";
import styles from "./BattleStage.module.css";

// ========== Constants ==========

// 渲染用六边形尺寸
const RENDER_HEX_SIZE = 52;
const HEX_SPACING = 2;

// ========== Props ==========

import type { FloatingTextInstance, MeleeStrikeInstance } from "@/lib/battle-replay";

export interface BattleStageProps {
  actors: Map<string, ActorState>;
  events: InkMonReplayEvent[];
  /** 地图配置（来自回放数据） */
  mapConfig?: HexMapConfig;
  /** 插值位置（用于移动动画） */
  interpolatedPositions?: Map<string, { q: number; r: number }>;
  /** 飘字列表（来自 RenderState） */
  floatingTexts?: FloatingTextInstance[];
  /** 近战打击特效列表（来自 RenderState） */
  meleeStrikes?: MeleeStrikeInstance[];
}

// ========== Helper Functions ==========

/**
 * 绘制单个六边形（支持 flat-top 和 pointy-top）
 */
function drawHex(
  ctx: CanvasRenderingContext2D,
  center: PixelCoord,
  size: number,
  orientation: "flat" | "pointy",
  fillStyle?: string,
  strokeStyle: string = "rgba(255,255,255,0.15)",
  lineWidth: number = 1
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // flat-top: 从 0 度开始; pointy-top: 从 -30 度开始
    const angleDeg = orientation === "flat" ? 60 * i : 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = center.x + size * Math.cos(angleRad);
    const y = center.y + size * Math.sin(angleRad);
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
  mapConfig,
  interpolatedPositions,
  floatingTexts: externalFloatingTexts,
  meleeStrikes: externalMeleeStrikes,
}: BattleStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // 创建 HexGridModel 实例（用于坐标计算）
  // 使用渲染尺寸，这样 coordToWorld 直接返回渲染坐标
  const gridModel = useMemo(() => {
    if (mapConfig) {
      return new HexGridModel({
        rows: mapConfig.rows,
        columns: mapConfig.columns,
        hexSize: RENDER_HEX_SIZE,
        orientation: mapConfig.orientation,
      });
    }
    // 默认使用 radius=4 的六边形区域
    return new HexGridModel({
      drawMode: "baseOnRadius",
      radius: 4,
      hexSize: RENDER_HEX_SIZE,
      orientation: "pointy",
    });
  }, [mapConfig]);

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

    const hexSize = gridModel.config.hexSize;
    const orientation = gridModel.config.orientation;

    // 绘制网格（使用 HexGridModel 遍历所有格子）
    for (const tile of gridModel.getAllTiles()) {
      const worldPos = gridModel.coordToWorld(tile.coord);
      const x = worldPos.x + offsetX;
      const y = worldPos.y + offsetY;

      // 绘制六边形
      drawHex(
        ctx,
        { x, y },
        hexSize - HEX_SPACING,
        orientation,
        "rgba(255,255,255,0.04)",
        "rgba(255,255,255,0.12)",
        1
      );

      // 绘制坐标文字
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${tile.coord.q},${tile.coord.r}`, x, y);
    }

    // 绘制单位
    for (const [id, actor] of actors) {
      if (!actor.isAlive) continue;

      // 优先使用插值位置（动画中），否则使用逻辑位置
      const pos = interpolatedPositions?.get(id) ?? actor.position;
      const worldPos = gridModel.coordToWorld(pos);
      const x = worldPos.x + offsetX;
      const y = worldPos.y + offsetY;

      // 队伍颜色
      const teamColor = actor.team === "A" ? "#22c55e" : "#ef4444";
      const teamBg = actor.team === "A" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";

      // 绘制单位底座
      ctx.beginPath();
      ctx.arc(x, y, hexSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = teamBg;
      ctx.fill();
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制单位名称
      const displayName = actor.displayName.slice(0, 2);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayName, x, y - 4);

      // 绘制血条背景
      const hpBarWidth = hexSize * 1.2;
      const hpBarHeight = 5;
      const hpBarX = x - hpBarWidth / 2;
      const hpBarY = y + hexSize * 0.35;

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

      // 绘制血条
      const hpPercent = actor.hp / actor.maxHp;
      const hpColor = hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillStyle = hpColor;
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

      // 绘制队伍标识
      ctx.beginPath();
      ctx.arc(x + hexSize * 0.4, y - hexSize * 0.4, 10, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(actor.team, x + hexSize * 0.4, y - hexSize * 0.4);
    }

    // 绘制近战打击特效
    if (externalMeleeStrikes && externalMeleeStrikes.length > 0) {
      // 坐标缩放因子：RenderWorld 使用逻辑层 hexSize (50)，BattleStage 使用渲染层 hexSize (52)
      const logicHexSize = mapConfig?.hexSize ?? 50;
      const scaleFactor = RENDER_HEX_SIZE / logicHexSize;

      for (const strike of externalMeleeStrikes) {
        // 使用 ActionScheduler 计算的 progress，避免时间不同步
        const progress = strike.progress;

        // 计算屏幕坐标
        const fromX = strike.from.x * scaleFactor + offsetX;
        const fromY = strike.from.y * scaleFactor + offsetY;
        const toX = strike.to.x * scaleFactor + offsetX;
        const toY = strike.to.y * scaleFactor + offsetY;

        // 计算方向向量
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 使用 easeOutQuad 让特效加速飞向目标
        const easedProgress = progress * (2 - progress);

        // 当前位置
        const currentX = fromX + dx * easedProgress;
        const currentY = fromY + dy * easedProgress;

        const color = strike.color ?? '#ff8c00';

        // 解析颜色为 RGB（用于渐变）
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        ctx.save();

        // === 1. 绘制拖尾效果 ===
        if (progress < 0.95) {
          // 拖尾长度随进度增加
          const tailLength = Math.min(distance * 0.4, 60) * Math.min(progress * 2, 1);
          const tailStartX = currentX - Math.cos(angle) * tailLength;
          const tailStartY = currentY - Math.sin(angle) * tailLength;

          // 渐变拖尾
          const gradient = ctx.createLinearGradient(tailStartX, tailStartY, currentX, currentY);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
          gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);

          ctx.beginPath();
          ctx.moveTo(tailStartX, tailStartY);
          ctx.lineTo(currentX, currentY);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // === 2. 绘制飞行弹头 ===
        if (progress < 0.95) {
          // 发光效果
          const glowRadius = 12;
          const glowGradient = ctx.createRadialGradient(
            currentX, currentY, 0,
            currentX, currentY, glowRadius
          );
          glowGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
          glowGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.8)`);
          glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.beginPath();
          ctx.arc(currentX, currentY, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = glowGradient;
          ctx.fill();

          // 核心亮点
          ctx.beginPath();
          ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'white';
          ctx.fill();
        }

        // === 3. 命中爆炸效果 ===
        if (progress > 0.85) {
          const impactProgress = (progress - 0.85) / 0.15;
          const impactEased = 1 - Math.pow(1 - impactProgress, 3); // easeOutCubic

          // 爆炸圆环
          const ringRadius = 8 + impactEased * 35;
          const ringAlpha = 1 - impactProgress;

          ctx.beginPath();
          ctx.arc(toX, toY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ringAlpha * 0.8})`;
          ctx.lineWidth = 3 - impactProgress * 2;
          ctx.stroke();

          // 内部闪光
          if (impactProgress < 0.5) {
            const flashAlpha = 1 - impactProgress * 2;
            const flashRadius = 15 * (1 - impactProgress);

            const flashGradient = ctx.createRadialGradient(
              toX, toY, 0,
              toX, toY, flashRadius
            );
            flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
            flashGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${flashAlpha * 0.5})`);
            flashGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.beginPath();
            ctx.arc(toX, toY, flashRadius, 0, Math.PI * 2);
            ctx.fillStyle = flashGradient;
            ctx.fill();
          }
        }

        ctx.restore();
      }
    }
  }, [gridModel, actors, canvasSize, interpolatedPositions, externalMeleeStrikes, mapConfig]);

  // 计算飘字的屏幕位置
  const floatingTextsWithPosition = useMemo(() => {
    if (!externalFloatingTexts || externalFloatingTexts.length === 0) return [];

    const offsetX = canvasSize.width / 2;
    const offsetY = canvasSize.height / 2;
    const now = Date.now();

    return externalFloatingTexts.map((ft) => {
      // 计算动画进度 (0 ~ 1)
      const elapsed = now - ft.startTime;
      const progress = Math.min(1, elapsed / ft.duration);

      // 飘字向上移动 + 淡出
      const yOffset = -50 - progress * 40; // 从 -50 移动到 -90
      const opacity = 1 - progress * 0.6; // 从 1 淡出到 0.4

      // 使用 actorId 获取角色位置，重新计算渲染坐标
      let x = ft.position.x + offsetX;
      let y = ft.position.y + offsetY + yOffset;

      if (ft.actorId) {
        const actor = actors.get(ft.actorId);
        if (actor) {
          // 使用插值位置（如果有）
          const pos = interpolatedPositions?.get(ft.actorId) ?? actor.position;
          const worldPos = gridModel.coordToWorld(pos);
          x = worldPos.x + offsetX;
          y = worldPos.y + offsetY + yOffset;
        }
      }

      return {
        id: ft.id,
        text: ft.text,
        x,
        y,
        color: ft.color,
        opacity,
        style: ft.style,
      };
    });
  }, [externalFloatingTexts, canvasSize, actors, interpolatedPositions, gridModel]);

  return (
    <div ref={containerRef} className={styles.stageContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* 飘字层 */}
      <div className={styles.floatingTextsContainer}>
        {floatingTextsWithPosition.map((text) => (
          <div
            key={text.id}
            className={`${styles.floatingText} ${text.style === 'critical' ? styles.critical : ''}`}
            style={{
              left: text.x,
              top: text.y,
              color: text.color,
              opacity: text.opacity,
            }}
          >
            {text.text}
          </div>
        ))}
      </div>
    </div>
  );
}
