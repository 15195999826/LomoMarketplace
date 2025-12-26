import { ItemContainer } from "@/components/items";
import { ItemsPageWrapper } from "./ItemsPageWrapper";
import styles from "./page.module.css";

export const metadata = {
  title: "物品图鉴 - InkWorld",
  description: "探索 InkWorld 中的各种物品和装备",
};

export default function ItemsPage() {
  return (
    <div className={styles.pageWrapper}>
      <ItemsPageWrapper />
      <section className={`container ${styles.content}`}>
        <ItemContainer />
      </section>
    </div>
  );
}
