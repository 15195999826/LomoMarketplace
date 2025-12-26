"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { InkMonListItem } from "@inkmon/core";
import { ElementBadge } from "../common/ElementBadge";
import styles from "./PokedexListItem.module.css";

// 进化阶段中文映射
const STAGE_NAMES: Record<string, string> = {
  Baby: "幼年",
  Basic: "基础",
  "Stage 1": "一阶",
  "Stage 2": "二阶",
  Mega: "超级",
};

// 尝试的图片格式
const IMAGE_EXTENSIONS = ["png", "jpg", "webp"];

interface PokedexListItemProps {
  inkmon: InkMonListItem;
  showDelete?: boolean;
  onDelete?: (nameEn: string) => void;
}

export function PokedexListItem({
  inkmon,
  showDelete = false,
  onDelete,
}: PokedexListItemProps) {
  const [imageError, setImageError] = useState(false);
  const [currentExtIndex, setCurrentExtIndex] = useState(0);

  // 使用配色板生成渐变背景
  const gradientBg =
    inkmon.color_palette.length >= 2
      ? `linear-gradient(135deg, ${inkmon.color_palette[0]} 0%, ${inkmon.color_palette[1]} 100%)`
      : inkmon.color_palette[0] || "#ccc";

  // 当前尝试的图片 URL
  const imageUrl = `/images/inkmon/${inkmon.name_en}/main.${IMAGE_EXTENSIONS[currentExtIndex]}`;

  const handleImageError = () => {
    if (currentExtIndex < IMAGE_EXTENSIONS.length - 1) {
      setCurrentExtIndex((prev) => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // HP 能力值颜色
  const getStatColor = (value: number) => {
    if (value >= 100) return "#22c55e"; // 高 - 绿
    if (value >= 70) return "#3b82f6"; // 中 - 蓝
    if (value >= 40) return "#f59e0b"; // 低 - 橙
    return "#ef4444"; // 很低 - 红
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(inkmon.name_en);
  };

  return (
    <Link href={`/inkmon/${inkmon.name_en}`} className={styles.listItem}>
      {/* 缩略图 */}
      <div className={styles.thumbnail}>
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={inkmon.name}
            fill
            sizes="48px"
            className={styles.thumbnailImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.thumbnailInner} style={{ background: gradientBg }}>
            {inkmon.name.charAt(0)}
          </div>
        )}
      </div>

      {/* 图鉴编号 */}
      <span className={styles.dexNumber}>
        #{String(inkmon.dex_number).padStart(3, "0")}
      </span>

      {/* 属性 */}
      <div className={styles.elementWrapper}>
        <ElementBadge element={inkmon.primary_element} size="sm" />
      </div>

      {/* 名称 */}
      <div className={styles.nameWrapper}>
        <h3 className={styles.name}>{inkmon.name}</h3>
        <p className={styles.nameEn}>{inkmon.name_en}</p>
      </div>

      {/* HP 能力值预览 */}
      <div className={styles.statsPreview}>
        <div className={styles.statBar}>
          <div
            className={styles.statBarFill}
            style={{
              width: `${Math.min((inkmon.base_stats.hp / 150) * 100, 100)}%`,
              backgroundColor: getStatColor(inkmon.base_stats.hp),
            }}
          />
        </div>
        <span className={styles.statValue}>{inkmon.base_stats.hp}</span>
      </div>

      {/* 进化阶段 */}
      <span className={styles.stage}>
        {STAGE_NAMES[inkmon.evolution_stage] || inkmon.evolution_stage}
      </span>

      {/* 删除按钮 */}
      {showDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDeleteClick}
          aria-label={`删除 ${inkmon.name}`}
          title={`删除 ${inkmon.name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      )}
    </Link>
  );
}
