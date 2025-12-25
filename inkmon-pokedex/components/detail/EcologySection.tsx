"use client";

import type { InkMon } from "@inkmon/core";
import styles from "./EcologySection.module.css";

interface EcologySectionProps {
  ecology: InkMon["ecology"];
}

const DIET_NAMES: Record<string, string> = {
  herbivore: "草食",
  carnivore: "肉食",
  omnivore: "杂食",
  special: "特殊",
};

export function EcologySection({ ecology }: EcologySectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.title}>生态信息</h2>

      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>栖息地</span>
          <span className={styles.value}>{ecology.habitat}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>食性</span>
          <span className={styles.value}>{DIET_NAMES[ecology.diet]}</span>
        </div>
      </div>

      {ecology.prey.length > 0 && (
        <div className={styles.list}>
          <span className={styles.listLabel}>猎物</span>
          <div className={styles.tags}>
            {ecology.prey.map((p, i) => (
              <span key={i} className={styles.tag}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {ecology.predators.length > 0 && (
        <div className={styles.list}>
          <span className={styles.listLabel}>天敌</span>
          <div className={styles.tags}>
            {ecology.predators.map((p, i) => (
              <span key={i} className={styles.tag}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {ecology.symbiosis && ecology.symbiosis.length > 0 && (
        <div className={styles.list}>
          <span className={styles.listLabel}>共生关系</span>
          <div className={styles.tags}>
            {ecology.symbiosis.map((s, i) => (
              <span key={i} className={styles.tag}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
