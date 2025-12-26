"use client";

import styles from "./MapToggle.module.css";

export type MapMode = "hex" | "svg";

interface MapToggleProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

export function MapToggle({ mode, onChange }: MapToggleProps) {
  return (
    <div className={styles.toggleContainer}>
      <button
        type="button"
        className={`${styles.toggleButton} ${mode === "hex" ? styles.active : ""}`}
        onClick={() => onChange("hex")}
        aria-pressed={mode === "hex"}
      >
        <span className={styles.toggleIcon}>⬡</span>
        六边形
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${mode === "svg" ? styles.active : ""}`}
        onClick={() => onChange("svg")}
        aria-pressed={mode === "svg"}
      >
        <span className={styles.toggleIcon}>🎨</span>
        手绘
      </button>
    </div>
  );
}
