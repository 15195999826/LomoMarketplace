'use client';

import type { ValidationError } from './ConfigEditor';
import styles from './ValidationPanel.module.css';

export interface ValidationPanelProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
}

export function ValidationPanel({ errors, onErrorClick }: ValidationPanelProps) {
  if (errors.length === 0) {
    return (
      <div className={`${styles.panel} ${styles.success}`}>
        <span className={styles.icon}>✓</span>
        <span>配置有效</span>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.error}`}>
      <div className={styles.header}>
        <span className={styles.icon}>✗</span>
        <span>{errors.length} 个错误</span>
      </div>
      <ul className={styles.list}>
        {errors.map((error, index) => (
          <li
            key={index}
            className={`${styles.item} ${styles[error.severity]}`}
            onClick={() => onErrorClick?.(error)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.path}>{error.path}</span>
            <span className={styles.message}>{error.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
