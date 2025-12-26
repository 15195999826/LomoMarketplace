"use client";

import { useInkMons } from "@/contexts";
import { BattleSimulator } from "@/components/battle";
import { InkLoader } from "@/components/common";
import styles from "./page.module.css";

export function BattlePageWrapper() {
  const { inkmons, total, isLoading, isLoaded, error } = useInkMons();

  // 加载中状态
  if (!isLoaded && inkmons.length === 0) {
    return (
      <div className={styles.loadingState}>
        <InkLoader />
        <p>Loading InkMon data...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={styles.errorState}>
        <p>Failed to load InkMon data: {error}</p>
      </div>
    );
  }

  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.title}>⚔️ 战斗模拟器</h1>
        <p className={styles.subtitle}>
          从 {isLoaded ? total : inkmons.length} 只 InkMon 中选择队员，开始模拟战斗
          {isLoading && !isLoaded && " (加载中...)"}
        </p>
      </section>

      <section className={`container ${styles.content}`}>
        <BattleSimulator inkmons={inkmons} />
      </section>
    </>
  );
}
