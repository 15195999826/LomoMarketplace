import { getAllRegions } from "@/data/mock-regions";
import { WorldMap } from "@/components/world";
import styles from "./page.module.css";

export const metadata = {
  title: "世界地图 - InkWorld",
  description: "探索 InkWorld 的各个区域，发现不同生态环境中的 InkMon",
};

export default function WorldPage() {
  const regions = getAllRegions();

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <h1 className={styles.title}>InkWorld 世界地图</h1>
        <p className={styles.subtitle}>
          探索 {regions.length} 个独特区域，发现各地栖息的 InkMon
        </p>
      </section>

      <section className={`container ${styles.content}`}>
        <WorldMap regions={regions} />
      </section>
    </div>
  );
}
