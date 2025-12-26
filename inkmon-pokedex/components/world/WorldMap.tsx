"use client";

import { useState } from "react";
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

  // 统计数据
  const totalRegions = regions.length;
  const totalInkmons = regions.reduce((sum, r) => sum + r.inkmons.length, 0);
  const uniqueBiomes = new Set(regions.map(r => r.biome)).size;

  return (
    <div className={styles.container}>
      <div className={styles.mapSection}>
        <div className={styles.mapHeader}>
          <h2 className={styles.mapTitle}>
            🗺️ 探索 InkWorld
          </h2>
          <MapToggle mode={mapMode} onChange={setMapMode} />
        </div>

        {mapMode === "hex" ? (
          <HexagonGrid
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        ) : (
          <SvgMap
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalRegions}</span>
            <span className={styles.statLabel}>区域</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{uniqueBiomes}</span>
            <span className={styles.statLabel}>地形类型</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalInkmons}</span>
            <span className={styles.statLabel}>种 InkMon</span>
          </div>
        </div>
      </div>

      <div className={styles.detailSection}>
        <RegionCard region={selectedRegion} />
      </div>
    </div>
  );
}
