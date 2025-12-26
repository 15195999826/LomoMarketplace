"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Element } from "@inkmon/core";
import styles from "./SearchFilter.module.css";

// 属性配置
const ELEMENTS: { value: Element | ""; label: string; color: string }[] = [
  { value: "", label: "全部属性", color: "transparent" },
  { value: "fire", label: "火", color: "var(--element-fire)" },
  { value: "water", label: "水", color: "var(--element-water)" },
  { value: "grass", label: "草", color: "var(--element-grass)" },
  { value: "electric", label: "电", color: "var(--element-electric)" },
  { value: "ice", label: "冰", color: "var(--element-ice)" },
  { value: "rock", label: "岩", color: "var(--element-rock)" },
  { value: "ground", label: "地", color: "var(--element-ground)" },
  { value: "flying", label: "飞", color: "var(--element-flying)" },
  { value: "bug", label: "虫", color: "var(--element-bug)" },
  { value: "poison", label: "毒", color: "var(--element-poison)" },
  { value: "dark", label: "暗", color: "var(--element-dark)" },
  { value: "light", label: "光", color: "var(--element-light)" },
  { value: "steel", label: "钢", color: "var(--element-steel)" },
  { value: "dragon", label: "龙", color: "var(--element-dragon)" },
];

// 进化阶段配置
const STAGES = [
  { value: "", label: "全部阶段" },
  { value: "Baby", label: "幼年期" },
  { value: "Basic", label: "基础期" },
  { value: "Stage 1", label: "进化一阶" },
  { value: "Stage 2", label: "进化二阶" },
  { value: "Mega", label: "超级进化" },
];

export interface SearchFilterProps {
  onFilterChange: (filters: {
    search: string;
    element: string;
    stage: string;
  }) => void;
  resultCount?: number;
  isLoading?: boolean;
}

export function SearchFilter({
  onFilterChange,
  resultCount,
  isLoading = false,
}: SearchFilterProps) {
  const [search, setSearch] = useState("");
  const [element, setElement] = useState("");
  const [stage, setStage] = useState("");
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  const elementRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onFilterChange({ search: value, element, stage });
      }, 300);
    },
    [element, stage, onFilterChange]
  );

  // Direct filter changes
  const handleElementChange = useCallback(
    (value: string) => {
      setElement(value);
      setElementDropdownOpen(false);
      onFilterChange({ search, element: value, stage });
    },
    [search, stage, onFilterChange]
  );

  const handleStageChange = useCallback(
    (value: string) => {
      setStage(value);
      setStageDropdownOpen(false);
      onFilterChange({ search, element, stage: value });
    },
    [search, element, onFilterChange]
  );

  // Reset all filters
  const handleReset = useCallback(() => {
    setSearch("");
    setElement("");
    setStage("");
    onFilterChange({ search: "", element: "", stage: "" });
  }, [onFilterChange]);

  // Check if any filter is active
  const hasActiveFilters = search || element || stage;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
        setElementDropdownOpen(false);
      }
      if (stageRef.current && !stageRef.current.contains(event.target as Node)) {
        setStageDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get current element display
  const currentElement = ELEMENTS.find((e) => e.value === element) || ELEMENTS[0];
  const currentStage = STAGES.find((s) => s.value === stage) || STAGES[0];

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterContent}>
        {/* 搜索框 */}
        <div className={styles.searchWrapper}>
          <label className={styles.searchLabel} htmlFor="inkmon-search">
            搜索
          </label>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            id="inkmon-search"
            type="text"
            className={styles.searchInput}
            placeholder="输入名称搜索..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* 属性选择 - 自定义下拉框 */}
        <div className={styles.selectWrapper} ref={elementRef}>
          <label className={styles.selectLabel}>属性</label>
          <div className={styles.customSelect}>
            <button
              type="button"
              className={styles.customSelectTrigger}
              onClick={() => setElementDropdownOpen(!elementDropdownOpen)}
              data-open={elementDropdownOpen}
            >
              {currentElement.value && (
                <span
                  className={styles.elementDot}
                  style={{ backgroundColor: currentElement.color }}
                />
              )}
              {currentElement.label}
            </button>
            <div
              className={styles.customSelectDropdown}
              data-open={elementDropdownOpen}
            >
              {ELEMENTS.map((el) => (
                <div
                  key={el.value || "all"}
                  className={styles.customSelectOption}
                  data-selected={element === el.value}
                  onClick={() => handleElementChange(el.value)}
                >
                  {el.value && (
                    <span
                      className={styles.elementDot}
                      style={{ backgroundColor: el.color }}
                    />
                  )}
                  {el.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 进化阶段选择 - 自定义下拉框 */}
        <div className={styles.selectWrapper} ref={stageRef}>
          <label className={styles.selectLabel}>阶段</label>
          <div className={styles.customSelect}>
            <button
              type="button"
              className={styles.customSelectTrigger}
              onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
              data-open={stageDropdownOpen}
            >
              {currentStage.label}
            </button>
            <div
              className={styles.customSelectDropdown}
              data-open={stageDropdownOpen}
            >
              {STAGES.map((s) => (
                <div
                  key={s.value || "all"}
                  className={styles.customSelectOption}
                  data-selected={stage === s.value}
                  onClick={() => handleStageChange(s.value)}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 重置按钮 */}
        <button
          type="button"
          className={styles.resetButton}
          onClick={handleReset}
          disabled={!hasActiveFilters}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置
        </button>
      </div>

      {/* 结果计数 */}
      {resultCount !== undefined && (
        <div className={styles.resultCount}>
          找到 <strong>{resultCount}</strong> 个 InkMon
          {isLoading && (
            <span className={styles.loading}>
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      )}

      {/* 活跃筛选标签 */}
      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          {search && (
            <span className={styles.filterTag}>
              搜索: {search}
              <button onClick={() => handleSearchChange("")} aria-label="清除搜索">
                ×
              </button>
            </span>
          )}
          {element && (
            <span className={styles.filterTag}>
              <span
                className={styles.elementDot}
                style={{
                  backgroundColor: ELEMENTS.find((e) => e.value === element)?.color,
                }}
              />
              {ELEMENTS.find((e) => e.value === element)?.label}
              <button onClick={() => handleElementChange("")} aria-label="清除属性筛选">
                ×
              </button>
            </span>
          )}
          {stage && (
            <span className={styles.filterTag}>
              {STAGES.find((s) => s.value === stage)?.label}
              <button onClick={() => handleStageChange("")} aria-label="清除阶段筛选">
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
