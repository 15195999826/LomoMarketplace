import { BattlePageWrapper } from "./BattlePageWrapper";
import styles from "./page.module.css";

export const metadata = {
  title: "战斗模拟 - InkWorld",
  description: "组建你的 InkMon 队伍，模拟战斗对决",
};

export default function BattlePage() {
  return (
    <div className={styles.pageWrapper}>
      <BattlePageWrapper />
    </div>
  );
}
