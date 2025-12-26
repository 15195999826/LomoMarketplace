import { getAllItems, getItemCount } from "@/data/mock-items";
import { ItemContainer } from "@/components/items";
import styles from "./page.module.css";

export const metadata = {
  title: "物品图鉴 - InkWorld",
  description: "探索 InkWorld 中的各种物品和装备",
};

export default function ItemsPage() {
  const items = getAllItems();
  const total = getItemCount();

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <h1 className={styles.title}>物品图鉴</h1>
        <p className={styles.subtitle}>
          收集 InkWorld 中的 {total} 种珍贵物品
        </p>
      </section>

      <section className={`container ${styles.content}`}>
        <ItemContainer initialItems={items} />
      </section>
    </div>
  );
}
