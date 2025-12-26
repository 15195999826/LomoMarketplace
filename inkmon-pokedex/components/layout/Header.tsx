"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { href: "/", label: "图鉴", match: ["/", "/inkmon"] },
  { href: "/items", label: "物品", match: ["/items"] },
  { href: "/world", label: "世界地图", match: ["/world"] },
  { href: "/battle", label: "战斗模拟", match: ["/battle"] },
];

export function Header() {
  const pathname = usePathname();

  const isActive = (match: string[]) => {
    return match.some((path) => {
      if (path === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(path);
    });
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>墨</span>
          <span className={styles.logoText}>InkMon 图鉴</span>
        </Link>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(item.match) ? styles.navLinkActive : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
