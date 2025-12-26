"use client";

import type { Item } from "@/data/mock-items";
import { ItemCard } from "./ItemCard";
import styles from "./ItemGrid.module.css";

interface ItemGridProps {
  items: Item[];
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

export function ItemGrid({ items, showDelete = false, onDelete }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <svg
          className={styles.emptyIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
        <h3 className={styles.emptyTitle}>未找到物品</h3>
        <p className={styles.emptyText}>尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          showDelete={showDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
