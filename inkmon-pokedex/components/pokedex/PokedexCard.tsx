"use client";

import Link from "next/link";
import type { InkMonListItem } from "@inkmon/core";
import { ElementBadge } from "../common/ElementBadge";
import { ColorPalette } from "../common/ColorPalette";
import styles from "./PokedexCard.module.css";

interface PokedexCardProps {
  inkmon: InkMonListItem;
}

export function PokedexCard({ inkmon }: PokedexCardProps) {
  // 使用配色板生成渐变背景作为图片占位
  const gradientBg = inkmon.color_palette.length >= 2
    ? `linear-gradient(135deg, ${inkmon.color_palette[0]} 0%, ${inkmon.color_palette[1]} 100%)`
    : inkmon.color_palette[0] || "#ccc";

  return (
    <Link href={`/inkmon/${inkmon.name_en}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        <div
          className={styles.imagePlaceholder}
          style={{ background: gradientBg }}
        >
          <span className={styles.placeholderText}>
            {inkmon.name.charAt(0)}
          </span>
        </div>
      </div>
      <div className={styles.content}>
        <span className={styles.dexNumber}>
          #{String(inkmon.dex_number).padStart(3, "0")}
        </span>
        <h3 className={styles.name}>{inkmon.name}</h3>
        <p className={styles.nameEn}>{inkmon.name_en}</p>
        <div className={styles.elements}>
          <ElementBadge element={inkmon.primary_element} size="sm" />
          {inkmon.secondary_element && (
            <ElementBadge element={inkmon.secondary_element} size="sm" />
          )}
        </div>
        <div className={styles.palette}>
          <ColorPalette colors={inkmon.color_palette} size="sm" />
        </div>
      </div>
    </Link>
  );
}
