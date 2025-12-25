"use client";

import type { InkMon } from "@inkmon/core";
import { StatBar } from "../common/StatBar";
import styles from "./StatsSection.module.css";

interface StatsSectionProps {
  stats: InkMon["stats"];
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.title}>能力值</h2>
      <div className={styles.stats}>
        <StatBar label="hp" value={stats.hp} />
        <StatBar label="attack" value={stats.attack} />
        <StatBar label="defense" value={stats.defense} />
        <StatBar label="sp_attack" value={stats.sp_attack} />
        <StatBar label="sp_defense" value={stats.sp_defense} />
        <StatBar label="speed" value={stats.speed} />
      </div>
      <div className={styles.bst}>
        <span className={styles.bstLabel}>种族值总和 (BST)</span>
        <span className={styles.bstValue}>{stats.bst}</span>
      </div>
    </div>
  );
}
