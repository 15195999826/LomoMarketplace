import {
  initializeDatabase,
  setDatabasePath,
  getAllInkMons,
} from "@inkmon/core";
import path from "path";
import { BattleSimulator } from "@/components/battle";
import styles from "./page.module.css";

// 设置数据库路径
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

export const metadata = {
  title: "战斗模拟 - InkWorld",
  description: "组建你的 InkMon 队伍，模拟战斗对决",
};

export default function BattlePage() {
  const inkmons = getAllInkMons();

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <h1 className={styles.title}>⚔️ 战斗模拟器</h1>
        <p className={styles.subtitle}>
          从 {inkmons.length} 只 InkMon 中选择队员，开始模拟战斗
        </p>
      </section>

      <section className={`container ${styles.content}`}>
        <BattleSimulator inkmons={inkmons} />
      </section>
    </div>
  );
}
