"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { useDataProgress } from "@/contexts";
import { AuthButton } from "@/components/auth";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { href: "/", label: "图鉴", match: ["/", "/inkmon"] },
  { href: "/items", label: "物品", match: ["/items"] },
  { href: "/world", label: "世界地图", match: ["/world"] },
  { href: "/battle", label: "战斗模拟", match: ["/battle"] },
  { href: "/tools/pathfinding", label: "工具", match: ["/tools"] },
];

export function Header() {
  const pathname = usePathname();
  const { progress, triggerRefresh } = useDataProgress();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  // 计算进度百分比
  const progressPercent = progress.total > 0
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;

  const isActive = (match: string[]) => {
    return match.some((path) => {
      if (path === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(path);
    });
  };

  // 找到当前激活的导航项索引
  const activeIndex = NAV_ITEMS.findIndex((item) => isActive(item.match));

  // 更新滑块位置
  const updateSliderPosition = useCallback(() => {
    if (activeIndex === -1 || !navRef.current) return;

    const activeEl = itemRefs.current[activeIndex];
    if (!activeEl) return;

    const navRect = navRef.current.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    setSliderStyle({
      left: activeRect.left - navRect.left,
      width: activeRect.width,
    });
  }, [activeIndex]);

  // 监听路由变化和窗口大小变化
  useEffect(() => {
    updateSliderPosition();
  }, [updateSliderPosition]);

  useEffect(() => {
    window.addEventListener("resize", updateSliderPosition);
    return () => window.removeEventListener("resize", updateSliderPosition);
  }, [updateSliderPosition]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>Ink</span>
          <span className={styles.logoText}>InkMon 图鉴</span>
        </Link>
        <nav className={styles.nav} ref={navRef}>
          {/* 滑块指示器 */}
          <span
            className={styles.slider}
            style={{
              transform: `translateX(${sliderStyle.left}px)`,
              width: sliderStyle.width,
              opacity: sliderStyle.width > 0 ? 1 : 0,
            }}
          />
          {NAV_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => { itemRefs.current[index] = el; }}
              className={`${styles.navLink} ${isActive(item.match) ? styles.navLinkActive : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          {/* 刷新按钮 */}
          <button
            type="button"
            className={styles.refreshButton}
            onClick={triggerRefresh}
            disabled={progress.isLoading}
            title={progress.isLoading ? `加载中 ${progressPercent}%` : "刷新数据"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={progress.isLoading ? styles.spinning : ""}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
          <AuthButton />
        </div>
      </div>

      {/* 进度条 */}
      {progress.isLoading && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
