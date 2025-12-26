"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ItemCategory, ItemRarity } from "@/data/mock-items";
import styles from "./ItemSearchFilter.module.css";

// 分类配置
const CATEGORIES: { value: ItemCategory | ""; label: string; icon: string }[] = [
  { value: "", label: "全部分类", icon: "" },
  { value: "weapon", label: "武器", icon: "⚔️" },
  { value: "armor", label: "护甲", icon: "🛡️" },
  { value: "accessory", label: "饰品", icon: "💎" },
  { value: "consumable", label: "消耗品", icon: "🧪" },
  { value: "material", label: "材料", icon: "🔮" },
  { value: "key_item", label: "钥匙道具", icon: "🔑" },
];

// 稀有度配置
const RARITIES: { value: ItemRarity | ""; label: string; color: string }[] = [
  { value: "", label: "全部稀有度", color: "transparent" },
  { value: "common", label: "普通", color: "var(--rarity-common)" },
  { value: "rare", label: "稀有", color: "var(--rarity-rare)" },
  { value: "epic", label: "史诗", color: "var(--rarity-epic)" },
  { value: "legendary", label: "传说", color: "var(--rarity-legendary)" },
];

export interface ItemFilters {
  search: string;
  category: ItemCategory | "";
  rarity: ItemRarity | "";
}

interface ItemSearchFilterProps {
  onFilterChange: (filters: ItemFilters) => void;
  resultCount?: number;
  isLoading?: boolean;
}

export function ItemSearchFilter({
  onFilterChange,
  resultCount,
  isLoading = false,
}: ItemSearchFilterProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [rarity, setRarity] = useState<ItemRarity | "">("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖处理搜索
  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onFilterChange({ search: value, category, rarity });
    }, 300);
  }, [category, rarity, onFilterChange]);

  // 搜索变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  // 分类变化
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ItemCategory | "";
    setCategory(value);
    onFilterChange({ search, category: value, rarity });
  };

  // 稀有度变化
  const handleRarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ItemRarity | "";
    setRarity(value);
    onFilterChange({ search, category, rarity: value });
  };

  // 重置筛选
  const handleReset = () => {
    setSearch("");
    setCategory("");
    setRarity("");
    onFilterChange({ search: "", category: "", rarity: "" });
  };

  // 清除单个筛选
  const clearSearch = () => {
    setSearch("");
    onFilterChange({ search: "", category, rarity });
  };

  const clearCategory = () => {
    setCategory("");
    onFilterChange({ search, category: "", rarity });
  };

  const clearRarity = () => {
    setRarity("");
    onFilterChange({ search, category, rarity: "" });
  };

  const hasFilters = search || category || rarity;
  const categoryLabel = CATEGORIES.find(c => c.value === category);
  const rarityLabel = RARITIES.find(r => r.value === rarity);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterRow}>
        {/* 搜索框 */}
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索物品名称..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* 分类选择 */}
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={category}
            onChange={handleCategoryChange}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
          <svg className={styles.selectArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {/* 稀有度选择 */}
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={rarity}
            onChange={handleRarityChange}
          >
            {RARITIES.map(rar => (
              <option key={rar.value} value={rar.value}>
                {rar.label}
              </option>
            ))}
          </select>
          <svg className={styles.selectArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {/* 重置按钮 */}
        {hasFilters && (
          <button className={styles.resetButton} onClick={handleReset}>
            重置筛选
          </button>
        )}

        {/* 结果计数 */}
        {isLoading ? (
          <div className={styles.loading}>
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
          </div>
        ) : resultCount !== undefined && (
          <span className={styles.resultCount}>
            找到 <strong>{resultCount}</strong> 个物品
          </span>
        )}
      </div>

      {/* 活跃筛选标签 */}
      {hasFilters && (
        <div className={styles.activeTags}>
          {search && (
            <span className={styles.activeTag}>
              搜索: {search}
              <button onClick={clearSearch}>×</button>
            </span>
          )}
          {category && categoryLabel && (
            <span className={styles.activeTag}>
              {categoryLabel.icon} {categoryLabel.label}
              <button onClick={clearCategory}>×</button>
            </span>
          )}
          {rarity && rarityLabel && (
            <span className={styles.activeTag}>
              <span
                className={styles.colorIndicator}
                style={{ background: rarityLabel.color }}
              />
              {rarityLabel.label}
              <button onClick={clearRarity}>×</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
