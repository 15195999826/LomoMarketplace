"use client";

import type { InkMonListItem } from "@inkmon/core";
import { PokedexListItem } from "./PokedexListItem";
import styles from "./PokedexList.module.css";

interface PokedexListProps {
  inkmons: InkMonListItem[];
  showDelete?: boolean;
  onDelete?: (nameEn: string) => void;
  showHeader?: boolean;
}

export function PokedexList({
  inkmons,
  showDelete = false,
  onDelete,
  showHeader = true,
}: PokedexListProps) {
  if (inkmons.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg
          className={styles.emptyIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
        <h3 className={styles.emptyTitle}>未找到 InkMon</h3>
        <p className={styles.emptyText}>尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      {showHeader && (
        <div className={styles.listHeader}>
          <span className={styles.headerThumbnail}></span>
          <span className={styles.headerDex}>编号</span>
          <span className={styles.headerElement}>属性</span>
          <span className={styles.headerName}>名称</span>
          <span className={styles.headerStats}>HP</span>
          <span className={styles.headerStage}>阶段</span>
        </div>
      )}
      {inkmons.map((inkmon) => (
        <PokedexListItem
          key={inkmon.name_en}
          inkmon={inkmon}
          showDelete={showDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
