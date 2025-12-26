import {
  initializeDatabase,
  setDatabasePath,
  getInkMonsPaginated,
  getInkMonCount,
} from "@inkmon/core";
import path from "path";
import { PokedexContainer } from "@/components/pokedex";
import styles from "./page.module.css";

// 设置数据库路径
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

const PAGE_SIZE = 24;

export default async function HomePage() {
  // 服务端只获取第一批数据，提升首屏加载速度
  const firstBatch = getInkMonsPaginated(1, PAGE_SIZE);
  const total = getInkMonCount();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>InkMon 图鉴</h1>
        <p className={styles.subtitle}>
          探索 InkWorld，发现 {total} 种独特的 InkMon
        </p>
      </section>

      <section className={`container ${styles.content}`}>
        <PokedexContainer
          initialInkmons={firstBatch.data}
          total={total}
          pageSize={PAGE_SIZE}
          hasMore={firstBatch.hasMore}
        />
      </section>
    </div>
  );
}
