"use client";

import type { InkMon } from "@inkmon/core";
import styles from "./DesignSection.module.css";

interface DesignSectionProps {
  design: InkMon["design"];
  imagePrompt: string;
}

export function DesignSection({ design, imagePrompt }: DesignSectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.title}>设计特征</h2>
      <ul className={styles.features}>
        {design.features.map((feature, index) => (
          <li key={index} className={styles.feature}>
            {feature}
          </li>
        ))}
      </ul>

      <div className={styles.prompt}>
        <h3 className={styles.promptTitle}>AI 图像提示词</h3>
        <p className={styles.promptText}>{imagePrompt}</p>
      </div>
    </div>
  );
}
