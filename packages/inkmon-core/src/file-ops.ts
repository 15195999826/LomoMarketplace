import fs from "fs";
import path from "path";
import { InkMonSchema, type InkMon } from "./types.js";
import { addInkMon, updateInkMon, getInkMonByNameEn } from "./queries.js";

/**
 * 获取 inkmons 数据目录路径
 * 默认: process.cwd()/data/inkmons/
 */
export function getInkMonsDir(): string {
  return path.join(process.cwd(), "data", "inkmons");
}

/**
 * 从文件读取 InkMon JSON
 */
export function readInkMonFile(nameEn: string): { success: boolean; data?: InkMon; error?: string } {
  const filePath = path.join(getInkMonsDir(), `${nameEn}.json`);

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `文件不存在: ${nameEn}.json` };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    const result = InkMonSchema.safeParse(json);

    if (!result.success) {
      return { success: false, error: `JSON 验证失败: ${result.error.message}` };
    }

    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, error: `读取文件失败: ${(e as Error).message}` };
  }
}

/**
 * 从文件入库 InkMon
 */
export function addInkMonFromFile(nameEn: string): { success: boolean; message: string; id?: number } {
  const readResult = readInkMonFile(nameEn);

  if (!readResult.success) {
    return { success: false, message: readResult.error! };
  }

  return addInkMon(readResult.data!);
}

/**
 * 列出所有本地 InkMon 文件名 (不含 .json)
 */
export function listLocalInkMonFiles(): string[] {
  const dir = getInkMonsDir();

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}

/**
 * 比较差异结果
 */
export interface CompareResult {
  status: "not_in_db" | "not_in_file" | "identical" | "different";
  differences?: DiffItem[];
}

export interface DiffItem {
  path: string;
  fileValue: unknown;
  dbValue: unknown;
}

/**
 * 深度比较两个对象，返回差异路径
 */
function deepCompare(fileObj: unknown, dbObj: unknown, currentPath = ""): DiffItem[] {
  const diffs: DiffItem[] = [];

  if (typeof fileObj !== typeof dbObj) {
    diffs.push({ path: currentPath || "root", fileValue: fileObj, dbValue: dbObj });
    return diffs;
  }

  if (fileObj === null || dbObj === null) {
    if (fileObj !== dbObj) {
      diffs.push({ path: currentPath || "root", fileValue: fileObj, dbValue: dbObj });
    }
    return diffs;
  }

  if (Array.isArray(fileObj) && Array.isArray(dbObj)) {
    if (JSON.stringify(fileObj) !== JSON.stringify(dbObj)) {
      diffs.push({ path: currentPath || "root", fileValue: fileObj, dbValue: dbObj });
    }
    return diffs;
  }

  if (typeof fileObj === "object" && typeof dbObj === "object") {
    const fileKeys = Object.keys(fileObj as Record<string, unknown>);
    const dbKeys = Object.keys(dbObj as Record<string, unknown>);
    const allKeys = new Set([...fileKeys, ...dbKeys]);

    for (const key of allKeys) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      const fileVal = (fileObj as Record<string, unknown>)[key];
      const dbVal = (dbObj as Record<string, unknown>)[key];
      diffs.push(...deepCompare(fileVal, dbVal, newPath));
    }
    return diffs;
  }

  if (fileObj !== dbObj) {
    diffs.push({ path: currentPath || "root", fileValue: fileObj, dbValue: dbObj });
  }

  return diffs;
}

/**
 * 比较文件和数据库中的 InkMon
 */
export function compareInkMon(nameEn: string): { success: boolean; result?: CompareResult; error?: string } {
  const readResult = readInkMonFile(nameEn);

  if (!readResult.success) {
    // 文件不存在
    const dbData = getInkMonByNameEn(nameEn);
    if (dbData) {
      return { success: true, result: { status: "not_in_file" } };
    }
    return { success: false, error: readResult.error };
  }

  const dbData = getInkMonByNameEn(nameEn);

  if (!dbData) {
    return { success: true, result: { status: "not_in_db" } };
  }

  // 比较内容
  const differences = deepCompare(readResult.data!, dbData);

  if (differences.length === 0) {
    return { success: true, result: { status: "identical" } };
  }

  return {
    success: true,
    result: {
      status: "different",
      differences,
    },
  };
}

/**
 * 批量比较所有本地文件与数据库
 */
export interface BatchCompareItem {
  nameEn: string;
  result: CompareResult;
}

export function batchCompareInkMons(): BatchCompareItem[] {
  const localFiles = listLocalInkMonFiles();
  const results: BatchCompareItem[] = [];

  for (const nameEn of localFiles) {
    const compareResult = compareInkMon(nameEn);
    if (compareResult.success && compareResult.result) {
      results.push({ nameEn, result: compareResult.result });
    }
  }

  return results;
}

/**
 * 同步结果类型
 */
export interface SyncResult {
  success: boolean;
  action: "added" | "updated" | "skipped" | "failed";
  message: string;
  differences?: DiffItem[];
}

/**
 * 同步文件到数据库（根据比较结果）
 */
export function syncInkMonFromFile(nameEn: string): SyncResult {
  const compareResult = compareInkMon(nameEn);

  if (!compareResult.success) {
    return { success: false, action: "failed", message: compareResult.error! };
  }

  const { status, differences } = compareResult.result!;

  if (status === "identical") {
    return { success: true, action: "skipped", message: "内容一致" };
  }

  if (status === "not_in_file") {
    return { success: false, action: "failed", message: "文件不存在" };
  }

  const readResult = readInkMonFile(nameEn);
  if (!readResult.success) {
    return { success: false, action: "failed", message: readResult.error! };
  }

  if (status === "not_in_db") {
    const addResult = addInkMon(readResult.data!);
    return {
      success: addResult.success,
      action: addResult.success ? "added" : "failed",
      message: addResult.message,
    };
  }

  // status === "different"
  const updateResult = updateInkMon(readResult.data!);
  return {
    success: updateResult.success,
    action: updateResult.success ? "updated" : "failed",
    message: updateResult.message,
    differences,
  };
}
