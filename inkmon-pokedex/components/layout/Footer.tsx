"use client";

import styles from "./Footer.module.css";

interface FooterProps {
  totalCount?: number;
}

export function Footer({ totalCount }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.stats}>
          {totalCount !== undefined && (
            <span>共收录 <strong>{totalCount}</strong> 种 InkMon</span>
          )}
        </p>
        <p className={styles.copyright}>
          InkMon 图鉴 - 墨水生物世界
        </p>
      </div>
    </footer>
  );
}
