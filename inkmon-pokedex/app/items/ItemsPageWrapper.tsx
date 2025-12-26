"use client";

import { useItems } from "@/contexts";
import styles from "./page.module.css";

export function ItemsPageWrapper() {
  const { total, isLoaded } = useItems();

  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>物品图鉴</h1>
      <p className={styles.subtitle}>
        收集 InkWorld 中的 {isLoaded ? total : "..."} 种珍贵物品
      </p>
    </section>
  );
}
