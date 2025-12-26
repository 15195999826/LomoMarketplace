"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import type { WorldRegion } from "@/data/mock-regions";
import { BIOME_ICONS } from "@/data/mock-regions";
import styles from "./HexagonGrid.module.css";

interface HexagonGridProps {
  regions: WorldRegion[];
  selectedRegion: WorldRegion | null;
  onSelectRegion: (region: WorldRegion) => void;
}

// 六边形基础尺寸 (flat-top 平顶六边形)
const HEX_WIDTH = 130;
const HEX_HEIGHT = 112;
const HEX_HORIZ_SPACING = HEX_WIDTH * 0.75;  // 水平间距
const HEX_VERT_SPACING = HEX_HEIGHT;          // 垂直间距

// 将六边形坐标转换为像素位置 (flat-top 布局)
function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = q * HEX_HORIZ_SPACING;
  // flat-top: 偶数列偏移
  const y = r * HEX_VERT_SPACING + (q % 2 === 0 ? 0 : HEX_HEIGHT / 2);
  return { x, y };
}

export function HexagonGrid({ regions, selectedRegion, onSelectRegion }: HexagonGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // 计算网格边界和位置
  const { hexPositions, gridWidth, gridHeight } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const positions = regions.map(region => {
      const pos = hexToPixel(region.gridPosition.q, region.gridPosition.r);
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
      return { region, pos };
    });

    // 归一化位置（从 0 开始）
    const normalizedPositions = positions.map(({ region, pos }) => ({
      region,
      pos: {
        x: pos.x - minX,
        y: pos.y - minY,
      }
    }));

    return {
      hexPositions: normalizedPositions,
      gridWidth: maxX - minX + HEX_WIDTH,
      gridHeight: maxY - minY + HEX_HEIGHT,
    };
  }, [regions]);

  // 计算缩放比例以适应容器
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      // 留出边距（上下左右各 80px 用于标题、统计等 UI）
      const availableWidth = containerRect.width - 160;
      const availableHeight = containerRect.height - 160;

      const scaleX = availableWidth / gridWidth;
      const scaleY = availableHeight / gridHeight;
      const newScale = Math.min(scaleX, scaleY, 1.2); // 最大缩放 1.2

      setScale(Math.max(0.5, newScale)); // 最小缩放 0.5
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [gridWidth, gridHeight]);

  return (
    <div className={styles.gridContainer} ref={containerRef}>
      <div
        className={styles.grid}
        style={{
          width: gridWidth,
          height: gridHeight,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {hexPositions.map(({ region, pos }) => {
          const isSelected = selectedRegion?.id === region.id;

          return (
            <div
              key={region.id}
              className={`${styles.hexagon} ${isSelected ? styles.selected : ""}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: HEX_WIDTH,
                height: HEX_HEIGHT,
              }}
              onClick={() => onSelectRegion(region)}
            >
              <div className={`${styles.hexagonInner} ${styles[region.biome]}`}>
                <span className={styles.hexIcon}>
                  {BIOME_ICONS[region.biome]}
                </span>
                <span className={styles.hexName}>
                  {region.name_cn}
                </span>
                <span className={styles.hexCount}>
                  {region.inkmons.length} 种
                </span>
              </div>
              <div className={styles.tooltip}>
                <strong>{region.name_cn}</strong>
                <span>{region.inkmons.length} 种 InkMon</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
