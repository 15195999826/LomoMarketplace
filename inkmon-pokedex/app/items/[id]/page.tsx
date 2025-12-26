import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemById, getAllItems, CATEGORY_NAMES, RARITY_NAMES, type ItemCategory } from "@/data/mock-items";
import styles from "./page.module.css";

// 分类图标
const CATEGORY_ICONS: Record<ItemCategory, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💎',
  consumable: '🧪',
  material: '🔮',
  key_item: '🔑',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const items = getAllItems();
  return items.map((item) => ({
    id: item.id,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return { title: "物品未找到 - InkWorld" };
  }

  return {
    title: `${item.name_cn} - 物品图鉴 - InkWorld`,
    description: item.description,
  };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return (
      <div className={styles.pageWrapper}>
        <section className={`container ${styles.content}`}>
          <div className={styles.notFound}>
            <div className={styles.notFoundIcon}>📦</div>
            <h1 className={styles.notFoundTitle}>物品未找到</h1>
            <p className={styles.notFoundText}>
              该物品可能不存在或已被移除
            </p>
            <Link href="/items" className={styles.notFoundLink}>
              返回物品图鉴
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const gradientBg = item.color_palette.length >= 2
    ? `linear-gradient(135deg, ${item.color_palette[0]} 0%, ${item.color_palette[1]} 100%)`
    : item.color_palette[0] || "#ccc";

  return (
    <div className={styles.pageWrapper}>
      <section className={`container ${styles.content}`}>
        <Link href="/items" className={styles.backLink}>
          ← 返回物品图鉴
        </Link>

        <div className={styles.detailCard}>
          {/* 图片区域 */}
          <div className={styles.imageSection}>
            <div className={styles.mainImage} style={{ background: gradientBg }}>
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name_cn}
                  className={styles.itemImage}
                />
              ) : (
                <span className={styles.imagePlaceholder}>
                  {CATEGORY_ICONS[item.category]}
                </span>
              )}
              <span className={`${styles.rarityOverlay} ${styles[item.rarity]}`}>
                {RARITY_NAMES[item.rarity]}
              </span>
            </div>
          </div>

          {/* 信息区域 */}
          <div className={styles.infoSection}>
            <div className={styles.header}>
              <span className={`${styles.categoryBadge} ${styles[item.category]}`}>
                {CATEGORY_ICONS[item.category]} {CATEGORY_NAMES[item.category]}
              </span>
              <h1 className={styles.title}>{item.name_cn}</h1>
              <p className={styles.titleEn}>{item.name_en}</p>
            </div>

            {/* 描述 */}
            <div className={styles.descriptionSection}>
              <h2 className={styles.sectionTitle}>📜 物品描述</h2>
              <p className={styles.description}>{item.description}</p>
            </div>

            {/* 效果 (消耗品) */}
            {item.effect && (
              <div className={styles.effectSection}>
                <h2 className={styles.sectionTitle}>✨ 使用效果</h2>
                <p className={styles.effect}>{item.effect}</p>
              </div>
            )}

            {/* 属性 */}
            {item.stats && Object.keys(item.stats).length > 0 && (
              <div>
                <h2 className={styles.sectionTitle}>📊 属性加成</h2>
                <div className={styles.statsSection}>
                  {item.stats.attack && (
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>⚔️</div>
                      <p className={styles.statValue}>+{item.stats.attack}</p>
                      <p className={styles.statLabel}>攻击力</p>
                    </div>
                  )}
                  {item.stats.defense && (
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🛡️</div>
                      <p className={styles.statValue}>+{item.stats.defense}</p>
                      <p className={styles.statLabel}>防御力</p>
                    </div>
                  )}
                  {item.stats.speed && (
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>💨</div>
                      <p className={styles.statValue}>+{item.stats.speed}</p>
                      <p className={styles.statLabel}>速度</p>
                    </div>
                  )}
                  {item.stats.hp && (
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>❤️</div>
                      <p className={styles.statValue}>+{item.stats.hp}</p>
                      <p className={styles.statLabel}>生命值</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 配色板 */}
            {item.color_palette.length > 0 && (
              <div className={styles.paletteSection}>
                <h2 className={styles.sectionTitle}>🎨 配色板</h2>
                <div className={styles.palette}>
                  {item.color_palette.map((color, index) => (
                    <div
                      key={index}
                      className={styles.colorSwatch}
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
