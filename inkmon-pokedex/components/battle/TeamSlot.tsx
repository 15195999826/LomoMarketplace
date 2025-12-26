"use client";

import { useState } from "react";
import Image from "next/image";
import type { InkMonListItem } from "@inkmon/core";
import { ElementBadge } from "@/components/common/ElementBadge";
import styles from "./TeamSlot.module.css";

const IMAGE_EXTENSIONS = ["png", "jpg", "webp"];

interface TeamSlotProps {
  inkmon: InkMonListItem | null;
  onClick: () => void;
  onRemove?: () => void;
  slotIndex: number;
}

export function TeamSlot({ inkmon, onClick, onRemove, slotIndex }: TeamSlotProps) {
  const [imageError, setImageError] = useState(false);
  const [currentExtIndex, setCurrentExtIndex] = useState(0);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  if (!inkmon) {
    return (
      <div className={`${styles.slot} ${styles.empty}`} onClick={onClick}>
        <div className={styles.emptyIcon}>+</div>
        <p className={styles.emptyText}>选择 InkMon</p>
      </div>
    );
  }

  const gradientBg = inkmon.color_palette.length >= 2
    ? `linear-gradient(135deg, ${inkmon.color_palette[0]} 0%, ${inkmon.color_palette[1]} 100%)`
    : inkmon.color_palette[0] || "#ccc";

  const imageUrl = `/images/inkmon/${inkmon.name_en}/main.${IMAGE_EXTENSIONS[currentExtIndex]}`;

  const handleImageError = () => {
    if (currentExtIndex < IMAGE_EXTENSIONS.length - 1) {
      setCurrentExtIndex((prev) => prev + 1);
    } else {
      setImageError(true);
    }
  };

  return (
    <div className={`${styles.slot} ${styles.selectedSlot}`} onClick={onClick}>
      <button
        type="button"
        className={styles.removeButton}
        onClick={handleRemove}
        aria-label="移除"
      >
        ×
      </button>

      <div className={styles.imageWrapper}>
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={inkmon.name}
            fill
            sizes="80px"
            className={styles.inkmonImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.imagePlaceholder} style={{ background: gradientBg }}>
            {inkmon.name.charAt(0)}
          </div>
        )}
      </div>

      <h4 className={styles.inkmonName}>{inkmon.name}</h4>

      <ElementBadge element={inkmon.primary_element} size="sm" />

      <div className={styles.stats}>
        <span className={styles.stat}>
          <span className={styles.statIcon}>❤️</span>
          {inkmon.base_stats.hp}
        </span>
        <span className={styles.stat}>
          <span className={styles.statIcon}>⚔️</span>
          {inkmon.base_stats.attack}
        </span>
        <span className={styles.stat}>
          <span className={styles.statIcon}>🛡️</span>
          {inkmon.base_stats.defense}
        </span>
      </div>
    </div>
  );
}
