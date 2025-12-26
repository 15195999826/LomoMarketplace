import {
  initializeDatabase,
  setDatabasePath,
  getAllInkMons,
  getInkMonCount,
} from "@inkmon/core";
import path from "path";
import { PokedexContainer } from "@/components/pokedex";
import styles from "./page.module.css";

// 设置数据库路径
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

export default async function HomePage() {
  // 服务端获取数据
  const inkmons = getAllInkMons();
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
        <PokedexContainer initialInkmons={inkmons} />
      </section>
    </div>
  );
}
