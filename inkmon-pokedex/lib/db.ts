import { initializeDatabase, setDatabasePath } from "@inkmon/core";
import path from "path";

let initialized = false;

/**
 * 初始化数据库连接
 * 使用环境变量 INKMON_DB_PATH，如果未设置则使用默认路径
 */
export function initDb(): void {
  if (initialized) return;

  const dbPath =
    process.env.INKMON_DB_PATH ||
    path.join(process.cwd(), "..", "data", "inkmon.db");

  setDatabasePath(dbPath);
  initializeDatabase();
  initialized = true;
}
