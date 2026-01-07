/**
 * 回放文件管理器 - 保存和加载回放文件
 *
 * 提供回放文件的持久化功能：
 * - 自动生成带时间戳的文件名
 * - 保存回放到 JSON 文件
 * - 加载回放文件
 * - 列出已有的回放文件
 *
 * ## 使用示例
 *
 * ```typescript
 * const manager = new ReplayFileManager('./Replays');
 *
 * // 保存回放
 * const filename = await manager.saveReplay(replay);
 * console.log(`Saved to: ${filename}`);
 *
 * // 加载回放
 * const loaded = await manager.loadReplay(filename);
 *
 * // 列出所有回放
 * const files = await manager.listReplays();
 * ```
 */

import fs from "node:fs";
import path from "node:path";
import type { IBattleReplay } from "./ReplayTypes.js";

// ========== 配置接口 ==========

/**
 * 文件管理器配置
 */
export interface IReplayFileManagerConfig {
  /** 回放文件保存目录 */
  directory: string;

  /** 文件扩展名（默认 .json） */
  extension?: string;

  /** 是否格式化 JSON（默认 true） */
  prettyPrint?: boolean;

  /** 是否自动创建目录（默认 true） */
  autoCreateDir?: boolean;
}

/**
 * 回放文件信息
 */
export interface IReplayFileInfo {
  /** 文件名（不含路径） */
  filename: string;

  /** 完整路径 */
  fullPath: string;

  /** 文件大小（字节） */
  size: number;

  /** 创建时间 */
  createdAt: Date;

  /** 修改时间 */
  modifiedAt: Date;

  /** 回放元数据（如果能解析） */
  meta?: {
    battleId: string;
    result: string;
    totalRounds: number;
    recordedAt: number;
  };
}

// ========== 文件管理器类 ==========

/**
 * 回放文件管理器
 */
export class ReplayFileManager {
  private readonly config: Required<IReplayFileManagerConfig>;

  constructor(config: string | IReplayFileManagerConfig) {
    if (typeof config === "string") {
      this.config = {
        directory: config,
        extension: ".json",
        prettyPrint: true,
        autoCreateDir: true,
      };
    } else {
      this.config = {
        directory: config.directory,
        extension: config.extension ?? ".json",
        prettyPrint: config.prettyPrint ?? true,
        autoCreateDir: config.autoCreateDir ?? true,
      };
    }
  }

  // ========== 保存功能 ==========

  /**
   * 保存回放到文件
   *
   * @param replay 回放数据
   * @param customFilename 自定义文件名（可选，不含扩展名）
   * @returns 保存的文件名（含扩展名）
   */
  async saveReplay(
    replay: IBattleReplay,
    customFilename?: string,
  ): Promise<string> {
    // 确保目录存在
    await this.ensureDirectory();

    // 生成文件名
    const filename = customFilename
      ? `${customFilename}${this.config.extension}`
      : this.generateFilename(replay);

    const fullPath = path.join(this.config.directory, filename);

    // 序列化
    const content = this.config.prettyPrint
      ? JSON.stringify(replay, null, 2)
      : JSON.stringify(replay);

    // 写入文件
    await fs.promises.writeFile(fullPath, content, "utf-8");

    return filename;
  }

  /**
   * 同步保存回放到文件
   *
   * @param replay 回放数据
   * @param customFilename 自定义文件名（可选，不含扩展名）
   * @returns 保存的文件名（含扩展名）
   */
  saveReplaySync(replay: IBattleReplay, customFilename?: string): string {
    // 确保目录存在
    this.ensureDirectorySync();

    // 生成文件名
    const filename = customFilename
      ? `${customFilename}${this.config.extension}`
      : this.generateFilename(replay);

    const fullPath = path.join(this.config.directory, filename);

    // 序列化
    const content = this.config.prettyPrint
      ? JSON.stringify(replay, null, 2)
      : JSON.stringify(replay);

    // 写入文件
    fs.writeFileSync(fullPath, content, "utf-8");

    return filename;
  }

  // ========== 加载功能 ==========

  /**
   * 加载回放文件
   *
   * @param filename 文件名（含或不含扩展名）
   * @returns 回放数据
   */
  async loadReplay(filename: string): Promise<IBattleReplay> {
    const fullPath = this.resolveFilePath(filename);

    const content = await fs.promises.readFile(fullPath, "utf-8");
    const replay = JSON.parse(content) as IBattleReplay;

    // 基本验证
    this.validateReplay(replay);

    return replay;
  }

  /**
   * 同步加载回放文件
   *
   * @param filename 文件名（含或不含扩展名）
   * @returns 回放数据
   */
  loadReplaySync(filename: string): IBattleReplay {
    const fullPath = this.resolveFilePath(filename);

    const content = fs.readFileSync(fullPath, "utf-8");
    const replay = JSON.parse(content) as IBattleReplay;

    // 基本验证
    this.validateReplay(replay);

    return replay;
  }

  // ========== 列表功能 ==========

  /**
   * 列出所有回放文件
   *
   * @param loadMeta 是否加载元数据（默认 false，加载会更慢）
   * @returns 回放文件信息列表
   */
  async listReplays(loadMeta = false): Promise<IReplayFileInfo[]> {
    await this.ensureDirectory();

    const files = await fs.promises.readdir(this.config.directory);
    const replayFiles = files.filter((f) => f.endsWith(this.config.extension));

    const infos: IReplayFileInfo[] = [];

    for (const filename of replayFiles) {
      const fullPath = path.join(this.config.directory, filename);
      const stats = await fs.promises.stat(fullPath);

      const info: IReplayFileInfo = {
        filename,
        fullPath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };

      // 可选：加载元数据
      if (loadMeta) {
        try {
          const replay = await this.loadReplay(filename);
          info.meta = {
            battleId: replay.meta.battleId,
            result: replay.meta.result,
            totalRounds: replay.meta.totalRounds,
            recordedAt: replay.meta.recordedAt,
          };
        } catch {
          // 忽略无法解析的文件
        }
      }

      infos.push(info);
    }

    // 按修改时间倒序排列（最新的在前）
    infos.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    return infos;
  }

  /**
   * 同步列出所有回放文件
   *
   * @returns 回放文件信息列表
   */
  listReplaysSync(): IReplayFileInfo[] {
    this.ensureDirectorySync();

    const files = fs.readdirSync(this.config.directory);
    const replayFiles = files.filter((f) => f.endsWith(this.config.extension));

    const infos: IReplayFileInfo[] = [];

    for (const filename of replayFiles) {
      const fullPath = path.join(this.config.directory, filename);
      const stats = fs.statSync(fullPath);

      infos.push({
        filename,
        fullPath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      });
    }

    // 按修改时间倒序排列
    infos.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    return infos;
  }

  // ========== 删除功能 ==========

  /**
   * 删除回放文件
   *
   * @param filename 文件名
   */
  async deleteReplay(filename: string): Promise<void> {
    const fullPath = this.resolveFilePath(filename);
    await fs.promises.unlink(fullPath);
  }

  /**
   * 同步删除回放文件
   *
   * @param filename 文件名
   */
  deleteReplaySync(filename: string): void {
    const fullPath = this.resolveFilePath(filename);
    fs.unlinkSync(fullPath);
  }

  /**
   * 检查回放文件是否存在
   *
   * @param filename 文件名
   */
  exists(filename: string): boolean {
    const fullPath = this.resolveFilePath(filename);
    return fs.existsSync(fullPath);
  }

  // ========== 工具方法 ==========

  /**
   * 生成文件名
   *
   * 格式: replay_YYYYMMDD_HHMMSS_battleId_result.json
   */
  private generateFilename(replay: IBattleReplay): string {
    const date = new Date(replay.meta.recordedAt);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const battleId = replay.meta.battleId.replace(/[^a-zA-Z0-9-_]/g, "");
    const result = replay.meta.result.toLowerCase();

    return `replay_${timestamp}_${battleId}_${result}${this.config.extension}`;
  }

  /**
   * 解析文件路径
   */
  private resolveFilePath(filename: string): string {
    // 如果没有扩展名，添加默认扩展名
    if (!filename.endsWith(this.config.extension)) {
      filename = `${filename}${this.config.extension}`;
    }

    return path.join(this.config.directory, filename);
  }

  /**
   * 确保目录存在（异步）
   */
  private async ensureDirectory(): Promise<void> {
    if (!this.config.autoCreateDir) return;

    try {
      await fs.promises.access(this.config.directory);
    } catch {
      await fs.promises.mkdir(this.config.directory, { recursive: true });
    }
  }

  /**
   * 确保目录存在（同步）
   */
  private ensureDirectorySync(): void {
    if (!this.config.autoCreateDir) return;

    if (!fs.existsSync(this.config.directory)) {
      fs.mkdirSync(this.config.directory, { recursive: true });
    }
  }

  /**
   * 验证回放数据
   */
  private validateReplay(replay: IBattleReplay): void {
    if (!replay.version) {
      throw new Error("Invalid replay: missing version");
    }
    if (!replay.meta) {
      throw new Error("Invalid replay: missing meta");
    }
    if (!replay.meta.battleId) {
      throw new Error("Invalid replay: missing battleId");
    }
    if (!Array.isArray(replay.initialUnits)) {
      throw new Error("Invalid replay: missing initialUnits");
    }
    if (!Array.isArray(replay.rounds)) {
      throw new Error("Invalid replay: missing rounds");
    }
  }

  // ========== 属性访问 ==========

  /** 获取回放目录 */
  get directory(): string {
    return this.config.directory;
  }
}

/**
 * 创建回放文件管理器
 */
export function createReplayFileManager(
  config: string | IReplayFileManagerConfig,
): ReplayFileManager {
  return new ReplayFileManager(config);
}
