"use client";

import type { InkMonListItem } from "@inkmon/core";
import { PokedexCard } from "./PokedexCard";
import styles from "./PokedexGrid.module.css";

interface PokedexGridProps {
  inkmons: InkMonListItem[];
}

export function PokedexGrid({ inkmons }: PokedexGridProps) {
  if (inkmons.length === 0) {
    return (
      <div className={styles.empty}>
        <p>暂无 InkMon 数据</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {inkmons.map((inkmon) => (
        <PokedexCard key={inkmon.name_en} inkmon={inkmon} />
      ))}
    </div>
  );
}
