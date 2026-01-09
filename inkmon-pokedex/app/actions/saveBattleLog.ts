"use server";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const BATTLE_LOGS_DIR = path.join(process.cwd(), "data", "battle-logs");

export interface SaveBattleLogResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * 保存战斗日志到本地文件系统
 */
export async function saveBattleLog(
  battleId: string,
  logContent: string
): Promise<SaveBattleLogResult> {
  try {
    // 确保目录存在
    if (!existsSync(BATTLE_LOGS_DIR)) {
      await mkdir(BATTLE_LOGS_DIR, { recursive: true });
    }

    // 生成文件名：battleId_timestamp.txt
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${battleId}_${timestamp}.txt`;
    const filePath = path.join(BATTLE_LOGS_DIR, fileName);

    // 写入文件
    await writeFile(filePath, logContent, "utf-8");

    return {
      success: true,
      filePath: `data/battle-logs/${fileName}`,
    };
  } catch (error) {
    console.error("Failed to save battle log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
