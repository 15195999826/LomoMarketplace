"use client";

import type { WorldRegion, Biome } from "@/data/mock-regions";
import { BIOME_NAMES, BIOME_ICONS } from "@/data/mock-regions";
import styles from "./SvgMap.module.css";

interface SvgMapProps {
  regions: WorldRegion[];
  selectedRegion: WorldRegion | null;
  onSelectRegion: (region: WorldRegion) => void;
}

// 手绘风格的区域路径 (不规则边界)
const REGION_PATHS: Record<string, { path: string; labelPos: { x: number; y: number } }> = {
  'emerald-forest': {
    path: 'M200,150 Q210,140 230,145 Q250,150 260,160 Q275,170 280,190 Q285,210 275,230 Q265,245 250,250 Q235,255 215,250 Q195,245 185,230 Q175,215 180,195 Q185,175 195,160 Q200,150 200,150',
    labelPos: { x: 230, y: 200 },
  },
  'azure-depths': {
    path: 'M320,100 Q340,95 360,100 Q380,108 395,125 Q410,145 405,165 Q400,185 385,195 Q365,210 340,205 Q320,200 305,185 Q290,165 295,145 Q300,120 315,105 Q320,100 320,100',
    labelPos: { x: 350, y: 150 },
  },
  'crimson-peaks': {
    path: 'M100,180 Q115,165 135,170 Q155,175 170,190 Q185,205 180,225 Q175,245 160,260 Q140,275 120,270 Q100,265 85,250 Q70,230 75,210 Q80,190 95,175 Q100,180 100,180',
    labelPos: { x: 130, y: 220 },
  },
  'golden-dunes': {
    path: 'M340,220 Q360,210 385,215 Q410,220 425,240 Q440,260 435,285 Q430,310 410,325 Q385,340 355,335 Q330,330 315,310 Q300,290 305,265 Q310,240 330,225 Q340,220 340,220',
    labelPos: { x: 370, y: 275 },
  },
  'frost-realm': {
    path: 'M230,60 Q250,50 275,55 Q300,62 315,80 Q330,100 325,125 Q320,145 300,155 Q280,165 255,160 Q230,155 215,135 Q200,115 205,90 Q212,68 228,58 Q230,60 230,60',
    labelPos: { x: 265, y: 105 },
  },
  'misty-swamp': {
    path: 'M90,280 Q110,265 135,270 Q160,278 175,300 Q190,320 185,345 Q180,370 160,385 Q135,400 105,395 Q80,388 65,365 Q50,340 55,315 Q62,290 85,275 Q90,280 90,280',
    labelPos: { x: 120, y: 330 },
  },
  'storm-plains': {
    path: 'M210,280 Q235,270 260,275 Q285,282 300,305 Q315,330 310,355 Q305,380 280,395 Q255,408 225,400 Q195,392 180,370 Q165,345 170,315 Q178,288 205,275 Q210,280 210,280',
    labelPos: { x: 240, y: 335 },
  },
};

// 生态颜色映射
const BIOME_COLORS: Record<Biome, string> = {
  forest: 'var(--biome-forest)',
  ocean: 'var(--biome-ocean)',
  mountain: 'var(--biome-mountain)',
  desert: 'var(--biome-desert)',
  tundra: 'var(--biome-tundra)',
  swamp: 'var(--biome-swamp)',
};

export function SvgMap({ regions, selectedRegion, onSelectRegion }: SvgMapProps) {
  return (
    <div className={styles.mapContainer}>
      <div className={styles.svgWrapper}>
        <svg className={styles.mapSvg} viewBox="0 0 500 440" preserveAspectRatio="xMidYMid meet">
          {/* 定义滤镜 */}
          <defs>
            <filter id="ink-texture" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
            <filter id="shadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* 装饰性海洋背景 */}
          <rect x="280" y="70" width="200" height="200" rx="20" fill="rgba(33, 150, 243, 0.1)" className={styles.decorative} />

          {/* 装饰性波浪线 */}
          <path
            d="M10,400 Q50,390 90,400 Q130,410 170,400 Q210,390 250,400 Q290,410 330,400 Q370,390 410,400 Q450,410 490,400"
            className={styles.decorative}
          />

          {/* 绘制区域 */}
          {regions.map(region => {
            const pathData = REGION_PATHS[region.id];
            if (!pathData) return null;

            const isSelected = selectedRegion?.id === region.id;

            return (
              <g key={region.id}>
                <path
                  d={pathData.path}
                  className={`${styles.regionPath} ${styles[region.biome]} ${styles.sketchy} ${isSelected ? styles.selected : ''}`}
                  filter="url(#shadow)"
                  onClick={() => onSelectRegion(region)}
                />
                <text
                  x={pathData.labelPos.x}
                  y={pathData.labelPos.y - 15}
                  className={styles.regionIcon}
                >
                  {BIOME_ICONS[region.biome]}
                </text>
                <text
                  x={pathData.labelPos.x}
                  y={pathData.labelPos.y + 5}
                  className={styles.regionLabel}
                >
                  {region.name_cn}
                </text>
              </g>
            );
          })}

          {/* 标题 */}
          <text x="250" y="25" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fill="var(--ink-black)">
            InkWorld
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>地形图例</div>
        {Object.entries(BIOME_NAMES).map(([biome, name]) => (
          <div key={biome} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ background: BIOME_COLORS[biome as Biome] }}
            />
            <span>{BIOME_ICONS[biome as Biome]} {name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
