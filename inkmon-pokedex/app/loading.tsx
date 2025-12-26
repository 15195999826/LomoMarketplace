import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}>
        <span className={styles.inkDrop}>Ink</span>
      </div>
      <p className={styles.text}>加载中...</p>
    </div>
  );
}
