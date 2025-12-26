"use client";

import styles from "./ViewToggle.module.css";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className={styles.toggleContainer}>
      <button
        type="button"
        className={`${styles.toggleButton} ${mode === "grid" ? styles.active : ""}`}
        onClick={() => onChange("grid")}
        aria-label="卡片视图"
        title="卡片视图"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className={styles.toggleLabel}>卡片</span>
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${mode === "list" ? styles.active : ""}`}
        onClick={() => onChange("list")}
        aria-label="列表视图"
        title="列表视图"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className={styles.toggleLabel}>列表</span>
      </button>
    </div>
  );
}
