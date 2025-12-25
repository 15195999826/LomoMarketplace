import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

// 使用当前工作目录，数据库将在用户项目的 data/ 目录下创建
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "inkmon.db");

let db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!db) {
    // 确保 data 目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new DatabaseSync(DB_PATH);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDatabasePath(): string {
  return DB_PATH;
}
