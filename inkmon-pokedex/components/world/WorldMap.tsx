"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorldRegion } from "@/data/mock-regions";
import { MapToggle, type MapMode } from "./MapToggle";
import { HexagonGrid } from "./HexagonGrid";
import { SvgMap } from "./SvgMap";
import { RegionCard } from "./RegionCard";
import styles from "./WorldMap.module.css";

interface WorldMapProps {
  regions: WorldRegion[];
}

export function WorldMap({ regions }: WorldMapProps) {
  const [mapMode, setMapMode] = useState<MapMode>("hex");
  const [selectedRegion, setSelectedRegion] = useState<WorldRegion | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);

  // 统计数据
  const totalRegions = regions.length;
  const totalInkmons = regions.reduce((sum, r) => sum + r.inkmons.length, 0);
  const uniqueBiomes = new Set(regions.map(r => r.biome)).size;

  // 处理区域选择
  const handleSelectRegion = useCallback((region: WorldRegion) => {
    if (selectedRegion?.id === region.id) {
      // 点击同一区域，关闭卡片
      setIsCardVisible(false);
      setTimeout(() => setSelectedRegion(null), 300);
    } else {
      setSelectedRegion(region);
      setIsCardVisible(true);
    }
  }, [selectedRegion]);

  // 关闭详情卡片
  const handleCloseCard = useCallback(() => {
    setIsCardVisible(false);
    setTimeout(() => setSelectedRegion(null), 300);
  }, []);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedRegion) {
        handleCloseCard();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRegion, handleCloseCard]);

  return (
    <div className={styles.mapCanvas}>
      {/* 地图标题 - 内嵌在地图中 */}
      <div className={styles.mapTitle}>
        <h1 className={styles.title}>InkWorld</h1>
        <p className={styles.subtitle}>点击区域探索</p>
      </div>

      {/* 地图主体 */}
      <div className={styles.mapBody}>
        {mapMode === "hex" ? (
          <HexagonGrid
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />
        ) : (
          <SvgMap
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />
        )}
      </div>

      {/* 左下角统计数据 */}
      <div className={styles.statsOverlay}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalRegions}</span>
          <span className={styles.statLabel}>区域</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{uniqueBiomes}</span>
          <span className={styles.statLabel}>地形</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalInkmons}</span>
          <span className={styles.statLabel}>InkMon</span>
        </div>
      </div>

      {/* 右下角地图切换 */}
      <div className={styles.controlsOverlay}>
        <MapToggle mode={mapMode} onChange={setMapMode} />
      </div>

      {/* 装饰性罗盘 */}
      <div className={styles.compass}>
        <svg viewBox="0 0 60 60" className={styles.compassSvg}>
          <circle cx="30" cy="30" r="28" fill="none" stroke="var(--ink-black)" strokeWidth="1.5" opacity="0.6" />
          <circle cx="30" cy="30" r="22" fill="none" stroke="var(--ink-black)" strokeWidth="0.5" opacity="0.3" />
          <path d="M30,6 L33,30 L30,26 L27,30 Z" fill="var(--ink-black)" opacity="0.8" />
          <path d="M30,54 L33,30 L30,34 L27,30 Z" fill="var(--ink-light)" opacity="0.6" />
          <text x="30" y="14" textAnchor="middle" fontSize="8" fill="var(--ink-black)" fontFamily="var(--font-display)">N</text>
          <text x="30" y="52" textAnchor="middle" fontSize="6" fill="var(--ink-light)" fontFamily="var(--font-display)">S</text>
          <text x="10" y="33" textAnchor="middle" fontSize="6" fill="var(--ink-light)" fontFamily="var(--font-display)">W</text>
          <text x="50" y="33" textAnchor="middle" fontSize="6" fill="var(--ink-light)" fontFamily="var(--font-display)">E</text>
        </svg>
      </div>

      {/* 区域详情悬浮卡片 */}
      {selectedRegion && (
        <div className={`${styles.cardOverlay} ${isCardVisible ? styles.visible : ''}`}>
          <RegionCard region={selectedRegion} onClose={handleCloseCard} />
        </div>
      )}

      {/* 装饰性边框 */}
      <div className={styles.borderDecor}>
        <div className={styles.cornerTL} />
        <div className={styles.cornerTR} />
        <div className={styles.cornerBL} />
        <div className={styles.cornerBR} />
      </div>
    </div>
  );
}
