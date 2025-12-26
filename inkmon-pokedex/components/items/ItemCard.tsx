"use client";

import { useState } from "react";
import Link from "next/link";
import type { Item, ItemCategory } from "@/data/mock-items";
import styles from "./ItemCard.module.css";

interface ItemCardProps {
  item: Item;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

// 分类图标
const CATEGORY_ICONS: Record<ItemCategory, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💎',
  consumable: '🧪',
  material: '🔮',
  key_item: '🔑',
};

// 分类短名
const CATEGORY_SHORT: Record<ItemCategory, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗',
  material: '材料',
  key_item: '钥匙',
};

export function ItemCard({ item, showDelete = false, onDelete }: ItemCardProps) {
  const [imageError, setImageError] = useState(false);

  const gradientBg = item.color_palette.length >= 2
    ? `linear-gradient(135deg, ${item.color_palette[0]} 0%, ${item.color_palette[1]} 100%)`
    : item.color_palette[0] || "#ccc";

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(item.id);
  };

  return (
    <Link
      href={`/items/${item.id}`}
      className={`${styles.card} ${styles[item.rarity]}`}
    >
      {showDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDeleteClick}
          aria-label={`删除 ${item.name_cn}`}
          title={`删除 ${item.name_cn}`}
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
        <span className={`${styles.categoryBadge} ${styles[item.category]}`}>
          {CATEGORY_ICONS[item.category]} {CATEGORY_SHORT[item.category]}
        </span>
        <span className={`${styles.rarityBadge} ${styles[item.rarity]}`} />

        {item.image && !imageError ? (
          <img
            src={item.image}
            alt={item.name_cn}
            className={styles.cardImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={styles.imagePlaceholder}
            style={{ background: gradientBg }}
          >
            <span className={styles.placeholderIcon}>
              {CATEGORY_ICONS[item.category]}
            </span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{item.name_cn}</h3>
        <p className={styles.nameEn}>{item.name_en}</p>

        {item.stats && (
          <div className={styles.stats}>
            {item.stats.attack && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>⚔️</span>
                {item.stats.attack}
              </span>
            )}
            {item.stats.defense && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>🛡️</span>
                {item.stats.defense}
              </span>
            )}
            {item.stats.speed && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>💨</span>
                {item.stats.speed}
              </span>
            )}
            {item.stats.hp && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>❤️</span>
                {item.stats.hp}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
