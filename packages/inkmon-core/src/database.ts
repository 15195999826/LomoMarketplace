import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

// 数据库路径配置
let customDbPath: string | null = null;

/**
 * 设置自定义数据库路径
 * 必须在第一次调用 getDatabase() 之前设置
 */
export function setDatabasePath(dbPath: string): void {
  customDbPath = dbPath;
}

/**
 * 获取数据库路径
 * 默认使用 process.cwd()/data/inkmon.db
 */
export function getDatabasePath(): string {
  if (customDbPath) {
    return customDbPath;
  }
  return path.join(process.cwd(), "data", "inkmon.db");
}

let db: DatabaseSync | null = null;

/**
 * 获取数据库连接（单例）
 */
export function getDatabase(): DatabaseSync {
  if (!db) {
    const dbPath = getDatabasePath();
    const dataDir = path.dirname(dbPath);

    // 确保 data 目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new DatabaseSync(dbPath);
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
