"use client";

import type { InkMon } from "@inkmon/core";
import { ElementBadge } from "../common/ElementBadge";
import { ColorPalette } from "../common/ColorPalette";
import styles from "./InkmonHeader.module.css";

interface InkmonHeaderProps {
  inkmon: InkMon;
}

const STAGE_NAMES: Record<string, string> = {
  baby: "幼年期",
  mature: "成熟期",
  adult: "成年期",
};

export function InkmonHeader({ inkmon }: InkmonHeaderProps) {
  // 使用配色板生成渐变背景
  const gradientBg = inkmon.design.color_palette.length >= 2
    ? `linear-gradient(135deg, ${inkmon.design.color_palette[0]} 0%, ${inkmon.design.color_palette[1]} 100%)`
    : inkmon.design.color_palette[0] || "#ccc";

  return (
    <div className={styles.header}>
      <div className={styles.imageSection}>
        <div
          className={styles.imagePlaceholder}
          style={{ background: gradientBg }}
        >
          <span className={styles.placeholderText}>
            {inkmon.name}
          </span>
        </div>
        <div className={styles.palette}>
          <ColorPalette colors={inkmon.design.color_palette} size="lg" />
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.dexNumber}>
          #{String(inkmon.dex_number).padStart(3, "0")}
        </span>
        <h1 className={styles.name}>{inkmon.name}</h1>
        <p className={styles.nameEn}>{inkmon.name_en}</p>

        <div className={styles.elements}>
          <ElementBadge element={inkmon.elements.primary} size="lg" />
          {inkmon.elements.secondary && (
            <ElementBadge element={inkmon.elements.secondary} size="lg" />
          )}
        </div>

        <p className={styles.description}>{inkmon.description}</p>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>基础动物</span>
            <span className={styles.metaValue}>{inkmon.design.base_animal}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>进化阶段</span>
            <span className={styles.metaValue}>
              {STAGE_NAMES[inkmon.evolution.stage]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
