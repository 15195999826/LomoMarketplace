"use client";

import { useInkMons } from "@/contexts";
import styles from "./page.module.css";

export function HomePageWrapper() {
  const { total, isLoaded } = useInkMons();

  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>InkMon 图鉴</h1>
      <p className={styles.subtitle}>
        探索 InkWorld，发现 {isLoaded ? total : "..."} 种独特的 InkMon
      </p>
    </section>
  );
}
