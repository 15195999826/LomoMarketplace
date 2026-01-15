import type { Metadata } from "next";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "工具 - InkMon",
  description: "InkMon 开发工具集",
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.toolsContainer} data-tools-page>
      {children}
    </div>
  );
}
