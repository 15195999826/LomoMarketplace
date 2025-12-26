"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { InkMonListItem } from "@inkmon/core";
import { ElementBadge } from "../common/ElementBadge";
import { ColorPalette } from "../common/ColorPalette";
import styles from "./PokedexCard.module.css";

interface PokedexCardProps {
  inkmon: InkMonListItem;
  showDelete?: boolean;
  onDelete?: (nameEn: string) => void;
}

// 尝试的图片格式
const IMAGE_EXTENSIONS = ["png", "jpg", "webp"];

export function PokedexCard({ inkmon, showDelete = false, onDelete }: PokedexCardProps) {
  const [imageError, setImageError] = useState(false);
  const [currentExtIndex, setCurrentExtIndex] = useState(0);

  // 使用配色板生成渐变背景作为图片占位
  const gradientBg = inkmon.color_palette.length >= 2
    ? `linear-gradient(135deg, ${inkmon.color_palette[0]} 0%, ${inkmon.color_palette[1]} 100%)`
    : inkmon.color_palette[0] || "#ccc";

  // 当前尝试的图片 URL
  const imageUrl = `/images/inkmon/${inkmon.name_en}/main.${IMAGE_EXTENSIONS[currentExtIndex]}`;

  const handleImageError = () => {
    if (currentExtIndex < IMAGE_EXTENSIONS.length - 1) {
      // 尝试下一个扩展名
      setCurrentExtIndex((prev) => prev + 1);
    } else {
      // 所有格式都失败，显示占位符
      setImageError(true);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(inkmon.name_en);
  };

  return (
    <Link href={`/inkmon/${inkmon.name_en}`} className={styles.card}>
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className={styles.imageWrapper}>
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={inkmon.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className={styles.cardImage}
            onError={handleImageError}
          />
        ) : (
          <div
            className={styles.imagePlaceholder}
            style={{ background: gradientBg }}
          >
            <span className={styles.placeholderText}>
              {inkmon.name.charAt(0)}
            </span>
          </div>
        )}
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
