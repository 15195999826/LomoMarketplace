"use client";

import type { InkMonListItem } from "@inkmon/core";
import { ElementBadge } from "@/components/common/ElementBadge";
import styles from "./InkMonPickerItem.module.css";

interface InkMonPickerItemProps {
  inkmon: InkMonListItem;
  isSelected: boolean;
  selectedBy?: 'A' | 'B' | 'both';
  onClick: () => void;
}

export function InkMonPickerItem({ inkmon, isSelected, selectedBy, onClick }: InkMonPickerItemProps) {
  const gradientBg = inkmon.color_palette.length >= 2
    ? `linear-gradient(135deg, ${inkmon.color_palette[0]} 0%, ${inkmon.color_palette[1]} 100%)`
    : inkmon.color_palette[0] || "#ccc";

  return (
    <div
      className={`${styles.item} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={styles.imageWrapper}>
        <div className={styles.placeholder} style={{ background: gradientBg }}>
          {inkmon.name.charAt(0)}
        </div>
      </div>

      <p className={styles.dexNumber}>#{String(inkmon.dex_number).padStart(3, '0')}</p>
      <h4 className={styles.name}>{inkmon.name}</h4>

      <div className={styles.element}>
        <ElementBadge element={inkmon.primary_element} size="sm" />
      </div>

      {selectedBy && (
        <span className={styles.selectedBadge}>
          {selectedBy === 'both' ? '双方已选' : `队伍 ${selectedBy} 已选`}
        </span>
      )}
    </div>
  );
}
