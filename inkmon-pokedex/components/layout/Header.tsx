"use client";

import Link from "next/link";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>墨</span>
          <span className={styles.logoText}>InkMon 图鉴</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            图鉴
          </Link>
        </nav>
      </div>
    </header>
  );
}
