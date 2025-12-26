"use client";

import type { WorldRegion } from "@/data/mock-regions";
import { BIOME_ICONS } from "@/data/mock-regions";
import styles from "./HexagonGrid.module.css";

interface HexagonGridProps {
  regions: WorldRegion[];
  selectedRegion: WorldRegion | null;
  onSelectRegion: (region: WorldRegion) => void;
}

// 六边形尺寸
const HEX_WIDTH = 80;
const HEX_HEIGHT = 92;
const HEX_HORIZ_SPACING = HEX_WIDTH * 0.75;
const HEX_VERT_SPACING = HEX_HEIGHT;

// 将六边形坐标转换为像素位置
function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = q * HEX_HORIZ_SPACING;
  const y = r * HEX_VERT_SPACING + (q % 2 !== 0 ? HEX_HEIGHT / 2 : 0);
  return { x, y };
}

export function HexagonGrid({ regions, selectedRegion, onSelectRegion }: HexagonGridProps) {
  // 计算网格边界
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const hexPositions = regions.map(region => {
    const pos = hexToPixel(region.gridPosition.q, region.gridPosition.r);
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
    return { region, pos };
  });

  // 计算中心偏移
  const centerX = (minX + maxX + HEX_WIDTH) / 2;
  const centerY = (minY + maxY + HEX_HEIGHT) / 2;

  return (
    <div className={styles.gridContainer}>
      <div className={styles.grid}>
        {hexPositions.map(({ region, pos }) => {
          const isSelected = selectedRegion?.id === region.id;

          return (
            <div
              key={region.id}
              className={`${styles.hexagon} ${isSelected ? styles.selected : ""}`}
              style={{
                left: pos.x - centerX + 200,
                top: pos.y - centerY + 150,
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
              </div>
              <div className={styles.tooltip}>
                {region.name_cn} · {region.inkmons.length} 种 InkMon
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
