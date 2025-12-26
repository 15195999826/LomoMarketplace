"use client";

import { useState, useEffect, useRef } from "react";
import type { InkMonListItem } from "@inkmon/core";
import { InkMonPickerItem } from "./InkMonPickerItem";
import styles from "./InkMonPicker.module.css";

interface InkMonPickerProps {
  isOpen: boolean;
  onClose: () => void;
  inkmons: InkMonListItem[];
  onSelect: (inkmon: InkMonListItem) => void;
  selectedByTeamA: string[];
  selectedByTeamB: string[];
  currentTeam: 'A' | 'B';
}

export function InkMonPicker({
  isOpen,
  onClose,
  inkmons,
  onSelect,
  selectedByTeamA,
  selectedByTeamB,
  currentTeam,
}: InkMonPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // 筛选 InkMon
  const filteredInkmons = inkmons.filter(inkmon => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      inkmon.name.toLowerCase().includes(searchLower) ||
      inkmon.name_en.toLowerCase().includes(searchLower) ||
      String(inkmon.dex_number).includes(search)
    );
  });

  // 获取选中状态
  const getSelectedBy = (nameEn: string): 'A' | 'B' | 'both' | undefined => {
    const inA = selectedByTeamA.includes(nameEn);
    const inB = selectedByTeamB.includes(nameEn);
    if (inA && inB) return 'both';
    if (inA) return 'A';
    if (inB) return 'B';
    return undefined;
  };

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 点击背景关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`${styles.pickerOverlay} ${isOpen ? styles.open : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={styles.picker}>
        <div className={styles.pickerHeader}>
          <h2 className={styles.pickerTitle}>
            🎮 选择 InkMon (队伍 {currentTeam})
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.searchBar}>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="搜索名称或编号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.pickerList}>
          {filteredInkmons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <p className={styles.emptyText}>未找到匹配的 InkMon</p>
            </div>
          ) : (
            filteredInkmons.map(inkmon => (
              <InkMonPickerItem
                key={inkmon.name_en}
                inkmon={inkmon}
                isSelected={
                  (currentTeam === 'A' && selectedByTeamA.includes(inkmon.name_en)) ||
                  (currentTeam === 'B' && selectedByTeamB.includes(inkmon.name_en))
                }
                selectedBy={getSelectedBy(inkmon.name_en)}
                onClick={() => onSelect(inkmon)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
