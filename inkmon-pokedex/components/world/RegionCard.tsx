"use client";

import Link from "next/link";
import type { WorldRegion, Biome } from "@/data/mock-regions";
import { BIOME_NAMES, BIOME_ICONS } from "@/data/mock-regions";
import styles from "./RegionCard.module.css";

interface RegionCardProps {
  region: WorldRegion | null;
}

export function RegionCard({ region }: RegionCardProps) {
  if (!region) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗺️</div>
          <p className={styles.emptyText}>
            点击地图上的区域查看详情
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.biomeIcon} ${styles[region.biome]}`}>
          {BIOME_ICONS[region.biome]}
        </div>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>{region.name_cn}</h2>
          <p className={styles.titleEn}>{region.name_en}</p>
        </div>
        <span className={`${styles.biomeBadge} ${styles[region.biome]}`}>
          {BIOME_NAMES[region.biome]}
        </span>
      </div>

      <p className={styles.description}>{region.description}</p>

      {region.features && region.features.length > 0 && (
        <div className={styles.featuresSection}>
          <h3 className={styles.sectionTitle}>✨ 区域特点</h3>
          <div className={styles.features}>
            {region.features.map((feature, index) => (
              <span key={index} className={styles.feature}>
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {region.inkmons.length > 0 && (
        <div className={styles.inkmonsSection}>
          <h3 className={styles.sectionTitle}>🐾 栖息的 InkMon</h3>
          <div className={styles.inkmons}>
            {region.inkmons.map((inkmon) => (
              <Link
                key={inkmon}
                href={`/inkmon/${inkmon}`}
                className={styles.inkmonTag}
              >
                {inkmon}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
