"use client";

import { useState } from "react";
import Link from "next/link";
import type { Item, ItemCategory, ItemRarity, CATEGORY_NAMES, RARITY_NAMES } from "@/data/mock-items";
import styles from "./ItemListItem.module.css";

interface ItemListItemProps {
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

// 分类名称
const CATEGORY_LABEL: Record<ItemCategory, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗品',
  material: '材料',
  key_item: '钥匙道具',
};

// 稀有度名称
const RARITY_LABEL: Record<ItemRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export function ItemListItem({ item, showDelete = false, onDelete }: ItemListItemProps) {
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
      className={`${styles.listItem} ${styles[item.rarity]}`}
    >
      <div className={styles.iconWrapper} style={{ background: gradientBg }}>
        {item.image && !imageError ? (
          <img
            src={item.image}
            alt={item.name_cn}
            className={styles.itemImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={styles.iconPlaceholder}>
            {CATEGORY_ICONS[item.category]}
          </span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.nameSection}>
          <h3 className={styles.name}>{item.name_cn}</h3>
          <p className={styles.nameEn}>{item.name_en}</p>
        </div>

        <span className={`${styles.categoryBadge} ${styles[item.category]}`}>
          {CATEGORY_ICONS[item.category]} {CATEGORY_LABEL[item.category]}
        </span>

        <span className={`${styles.rarityBadge} ${styles[item.rarity]}`}>
          {RARITY_LABEL[item.rarity]}
        </span>

        {item.stats && (
          <div className={styles.stats}>
            {item.stats.attack && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>⚔️</span>
                <span className={styles.statValue}>{item.stats.attack}</span>
              </span>
            )}
            {item.stats.defense && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>🛡️</span>
                <span className={styles.statValue}>{item.stats.defense}</span>
              </span>
            )}
            {item.stats.speed && (
              <span className={styles.stat}>
                <span className={styles.statIcon}>💨</span>
                <span className={styles.statValue}>{item.stats.speed}</span>
              </span>
            )}
          </div>
        )}
      </div>

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
    </Link>
  );
}
