import { notFound } from "next/navigation";
import Link from "next/link";
import {
  initializeDatabase,
  setDatabasePath,
  getInkMonByNameEn,
} from "@inkmon/core";
import path from "path";
import { InkmonHeader } from "@/components/detail/InkmonHeader";
import { StatsSection } from "@/components/detail/StatsSection";
import { DesignSection } from "@/components/detail/DesignSection";
import { EcologySection } from "@/components/detail/EcologySection";
import styles from "./page.module.css";

// 设置数据库路径
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

interface PageProps {
  params: Promise<{ nameEn: string }>;
}

export default async function DetailPage({ params }: PageProps) {
  const { nameEn } = await params;
  const inkmon = getInkMonByNameEn(nameEn);

  if (!inkmon) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/" className={styles.backLink}>
          ← 返回图鉴
        </Link>

        <InkmonHeader inkmon={inkmon} />

        <div className={styles.sections}>
          <StatsSection stats={inkmon.stats} />

          <div className={styles.sideSections}>
            <DesignSection
              design={inkmon.design}
              imagePrompt={inkmon.image_prompts.design}
            />
            <EcologySection ecology={inkmon.ecology} />
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { nameEn } = await params;
  const inkmon = getInkMonByNameEn(nameEn);

  if (!inkmon) {
    return { title: "未找到 - InkMon 图鉴" };
  }

  return {
    title: `${inkmon.name} (${inkmon.name_en}) - InkMon 图鉴`,
    description: inkmon.description,
  };
}
