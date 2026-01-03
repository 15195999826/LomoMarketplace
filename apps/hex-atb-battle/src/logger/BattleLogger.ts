/**
 * BattleLogger - 战斗日志管理器
 *
 * 支持多种输出格式：
 * - 控制台：方案 B（角色名+技能名标识）
 * - 文件：console.log, summary.log, 角色视角日志
 *
 * 日志文件结构：
 * Logs/
 * ├── battle_2026-01-03_153000/
 * │   ├── console.log       # 控制台格式
 * │   ├── summary.log       # 执行摘要
 * │   └── actors/
 * │       ├── 牧师.log
 * │       └── ...
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LogCategory, DebugLogContext } from '@lomo/logic-game-framework';

// ========== 类型定义 ==========

/** 执行实例信息 */
export type ExecutionInfo = {
  executionId: string;
  actorId: string;
  actorName: string;
  abilityName: string;
  configId: string;
  startTime: number;
  endTime?: number;
  triggeredTags: { tag: string; time: number; actions: string[] }[];
  status: 'executing' | 'completed' | 'cancelled';
};

/** 日志配置 */
export type BattleLoggerConfig = {
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否输出到文件 */
  file: boolean;
  /** 日志根目录 */
  logDir: string;
  /** 最大保留战斗日志数 */
  maxBattleLogs: number;
};

// ========== BattleLogger ==========

export class BattleLogger {
  private config: BattleLoggerConfig;
  private battleId: string;
  private battleDir: string | null = null;

  /** 控制台日志缓冲 */
  private consoleBuffer: string[] = [];

  /** 执行实例追踪 */
  private executions: Map<string, ExecutionInfo> = new Map();

  /** 角色日志缓冲 */
  private actorLogs: Map<string, string[]> = new Map();

  /** 当前帧信息 */
  private currentTick = 0;
  private currentTime = 0;

  /** Actor ID -> 名称映射 */
  private actorNames: Map<string, string> = new Map();

  /** Execution ID -> Actor ID 映射 */
  private executionToActor: Map<string, string> = new Map();

  constructor(battleId: string, config: Partial<BattleLoggerConfig> = {}) {
    this.battleId = battleId;
    this.config = {
      console: true,
      file: true,
      logDir: 'Logs',
      maxBattleLogs: 10,
      ...config,
    };

    if (this.config.file) {
      this.initLogDir();
    }
  }

  // ========== 初始化 ==========

  private initLogDir(): void {
    // 创建日志根目录
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }

    // 创建本次战斗目录
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.battleDir = path.join(this.config.logDir, `battle_${timestamp}_${this.battleId}`);
    fs.mkdirSync(this.battleDir, { recursive: true });
    fs.mkdirSync(path.join(this.battleDir, 'actors'), { recursive: true });

    // 清理旧日志
    this.cleanOldLogs();
  }

  private cleanOldLogs(): void {
    const dirs = fs.readdirSync(this.config.logDir)
      .filter(d => d.startsWith('battle_'))
      .map(d => ({
        name: d,
        path: path.join(this.config.logDir, d),
        time: fs.statSync(path.join(this.config.logDir, d)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // 删除超出数量的旧目录
    if (dirs.length > this.config.maxBattleLogs) {
      for (const dir of dirs.slice(this.config.maxBattleLogs)) {
        fs.rmSync(dir.path, { recursive: true, force: true });
      }
    }
  }

  // ========== 角色注册 ==========

  /** 注册角色（用于 ID -> 名称映射） */
  registerActor(actorId: string, actorName: string): void {
    this.actorNames.set(actorId, actorName);
  }

  /** 获取角色名称 */
  getActorName(actorId: string): string {
    return this.actorNames.get(actorId) ?? actorId;
  }

  // ========== 框架日志处理 ==========

  /**
   * 处理框架层发来的日志
   * 用于 setDebugLogHandler 回调
   */
  handleFrameworkLog(category: LogCategory, message: string, context?: DebugLogContext): void {
    if (!context) {
      this.writeConsole(`[${category}] ${message}`);
      return;
    }

    switch (category) {
      case 'execution':
        this.handleExecutionLog(message, context);
        break;
      case 'timeline':
        this.handleTimelineLog(message, context);
        break;
      case 'ability':
        this.handleAbilityLog(message, context);
        break;
      default:
        this.writeConsole(`[${category}] ${message}`);
    }
  }

  private handleExecutionLog(message: string, ctx: DebugLogContext): void {
    const { executionId, elapsed } = ctx;
    if (!executionId) return;

    // 从 executions 获取完整信息
    const info = this.executions.get(executionId);
    if (!info) return;

    const { actorId, actorName, abilityName } = info;

    if (message === '开始执行') {
      // 跳过，由应用层通过 executionStart() 记录（包含完整的 actor 信息）
      return;
    } else if (message === '执行完成') {
      info.endTime = this.currentTime;
      info.status = 'completed';
      const label = `${actorName}:${abilityName}`;
      this.writeConsole(`[execution] [${label}] 完成 | ${elapsed}ms`);
      this.writeActorLog(actorId, actorName, `[${this.currentTime}ms] [${abilityName}] 完成 | ${elapsed}ms`);
    } else if (message === '执行取消') {
      info.endTime = this.currentTime;
      info.status = 'cancelled';
      const label = `${actorName}:${abilityName}`;
      this.writeConsole(`[execution] [${label}] 取消 @${elapsed}ms`);
      this.writeActorLog(actorId, actorName, `[${this.currentTime}ms] [${abilityName}] 取消 @${elapsed}ms`);
    }
  }

  private handleTimelineLog(message: string, ctx: DebugLogContext): void {
    const { executionId, tagName, tagTime, actions } = ctx;
    if (!executionId) return;

    const info = this.executions.get(executionId);
    if (!info) return;

    // 记录 tag
    info.triggeredTags.push({
      tag: tagName ?? '?',
      time: tagTime ?? 0,
      actions: actions ?? [],
    });

    const label = `${info.actorName}:${info.abilityName}`;
    const actionsStr = actions && actions.length > 0 ? ` → ${actions.join(', ')}` : '';
    this.writeConsole(`[timeline] [${label}] ${tagName} @${tagTime}ms${actionsStr}`);
    this.writeActorLog(info.actorId, info.actorName, `  └─ ${tagName} @${tagTime}ms${actionsStr}`);
  }

  private handleAbilityLog(message: string, ctx: DebugLogContext): void {
    const actorId = ctx.actorId ?? '???';
    const actorName = this.getActorName(actorId);
    const abilityName = ctx.abilityName ?? ctx.configId ?? '???';

    this.writeConsole(`[ability] [${actorName}] ${message} [${abilityName}]`);
  }

  // ========== 帧控制 ==========

  /** 开始新的一帧 */
  tick(tickCount: number, logicTime: number): void {
    this.currentTick = tickCount;
    this.currentTime = logicTime;

    const line = `\n--- Tick ${tickCount} | ${logicTime}ms ---`;
    this.writeConsole(line);
  }

  // ========== 执行实例日志 ==========

  /** 记录执行开始 */
  executionStart(
    executionId: string,
    actorId: string,
    actorName: string,
    abilityName: string,
    configId: string
  ): void {
    const info: ExecutionInfo = {
      executionId,
      actorId,
      actorName,
      abilityName,
      configId,
      startTime: this.currentTime,
      triggeredTags: [],
      status: 'executing',
    };
    this.executions.set(executionId, info);
    this.executionToActor.set(executionId, actorId);

    const label = `${actorName}:${abilityName}`;
    this.writeConsole(`[execution] [${label}] 开始执行`);
    this.writeActorLog(actorId, actorName, `[${this.currentTime}ms] 开始执行 [${abilityName}]`);
  }

  /** 记录 Tag 触发 */
  tagTriggered(executionId: string, tagName: string, tagTime: number, actions: string[]): void {
    const info = this.executions.get(executionId);
    if (!info) return;

    info.triggeredTags.push({ tag: tagName, time: tagTime, actions });

    const label = `${info.actorName}:${info.abilityName}`;
    const actionsStr = actions.length > 0 ? ` → ${actions.join(', ')}` : '';
    this.writeConsole(`[timeline] [${label}] 触发 ${tagName} @${tagTime}ms${actionsStr}`);
    this.writeActorLog(info.actorId, info.actorName, `  └─ ${tagName} @${tagTime}ms${actionsStr}`);
  }

  /** 记录执行完成 */
  executionComplete(executionId: string, elapsed: number): void {
    const info = this.executions.get(executionId);
    if (!info) return;

    info.endTime = this.currentTime;
    info.status = 'completed';

    const label = `${info.actorName}:${info.abilityName}`;
    this.writeConsole(`[execution] [${label}] 完成 | ${elapsed}ms`);
    this.writeActorLog(info.actorId, info.actorName, `[${this.currentTime}ms] [${info.abilityName}] 完成 | ${elapsed}ms`);
  }

  /** 记录执行取消 */
  executionCancel(executionId: string, elapsed: number): void {
    const info = this.executions.get(executionId);
    if (!info) return;

    info.endTime = this.currentTime;
    info.status = 'cancelled';

    const label = `${info.actorName}:${info.abilityName}`;
    this.writeConsole(`[execution] [${label}] 取消 @${elapsed}ms`);
    this.writeActorLog(info.actorId, info.actorName, `[${this.currentTime}ms] [${info.abilityName}] 取消 @${elapsed}ms`);
  }

  // ========== 通用日志 ==========

  /** 记录角色获得行动机会 */
  actorReady(actorId: string, actorName: string, atb: number): void {
    this.writeConsole(`\n⚡ ${actorName} 获得行动机会 (ATB: ${atb.toFixed(1)})`);
    this.writeActorLog(actorId, actorName, `[${this.currentTime}ms] 获得行动机会 (ATB: ${atb.toFixed(1)})`);
  }

  /** 记录 AI 决策 */
  aiDecision(actorId: string, actorName: string, decision: string): void {
    this.writeConsole(`  🤖 决策: ${decision}`);
    this.writeActorLog(actorId, actorName, `  └─ 决策: ${decision}`);
  }

  /** 记录自定义日志 */
  log(message: string, actorId?: string, actorName?: string): void {
    this.writeConsole(message);
    if (actorId && actorName) {
      this.writeActorLog(actorId, actorName, `[${this.currentTime}ms] ${message}`);
    }
  }

  // ========== 输出方法 ==========

  private writeConsole(line: string): void {
    this.consoleBuffer.push(line);
    if (this.config.console) {
      console.log(line);
    }
  }

  private writeActorLog(actorId: string, actorName: string, line: string): void {
    const key = `${actorId}_${actorName}`;
    if (!this.actorLogs.has(key)) {
      this.actorLogs.set(key, [`=== ${actorName} (${actorId}) 战斗日志 ===\n`]);
    }
    this.actorLogs.get(key)!.push(line);
  }

  // ========== 保存日志 ==========

  /** 战斗结束时调用，保存所有日志 */
  save(): void {
    if (!this.config.file || !this.battleDir) return;

    // 保存控制台日志
    fs.writeFileSync(
      path.join(this.battleDir, 'console.log'),
      this.consoleBuffer.join('\n'),
      'utf-8'
    );

    // 保存执行摘要
    this.saveSummary();

    // 保存角色日志
    for (const [key, logs] of this.actorLogs) {
      const [actorId, actorName] = key.split('_');
      const fileName = `${actorName}.log`;
      fs.writeFileSync(
        path.join(this.battleDir, 'actors', fileName),
        logs.join('\n'),
        'utf-8'
      );
    }

    console.log(`\n📁 日志已保存到: ${this.battleDir}`);
  }

  private saveSummary(): void {
    const lines: string[] = [
      `=== 战斗执行摘要 ===`,
      `战斗 ID: ${this.battleId}`,
      `总时长: ${this.currentTime}ms`,
      `总帧数: ${this.currentTick}`,
      ``,
      `=== 执行实例列表 ===`,
    ];

    // 按角色分组
    const byActor = new Map<string, ExecutionInfo[]>();
    for (const info of this.executions.values()) {
      const key = info.actorName;
      if (!byActor.has(key)) {
        byActor.set(key, []);
      }
      byActor.get(key)!.push(info);
    }

    for (const [actorName, executions] of byActor) {
      lines.push(`\n【${actorName}】`);
      for (const exec of executions) {
        const duration = exec.endTime ? exec.endTime - exec.startTime : '?';
        const tags = exec.triggeredTags.map(t => `${t.tag}@${t.time}`).join(', ');
        const statusIcon = exec.status === 'completed' ? '✓' : exec.status === 'cancelled' ? '✗' : '...';
        lines.push(`  ${statusIcon} [${exec.abilityName}] ${exec.startTime}ms → ${exec.endTime ?? '?'}ms (${duration}ms)`);
        if (tags) {
          lines.push(`    触发: ${tags}`);
        }
      }
    }

    if (this.battleDir) {
      fs.writeFileSync(
        path.join(this.battleDir, 'summary.log'),
        lines.join('\n'),
        'utf-8'
      );
    }
  }
}

// ========== 全局实例 ==========

let globalBattleLogger: BattleLogger | null = null;

export function initBattleLogger(battleId: string, config?: Partial<BattleLoggerConfig>): BattleLogger {
  globalBattleLogger = new BattleLogger(battleId, config);
  return globalBattleLogger;
}

export function getBattleLogger(): BattleLogger | null {
  return globalBattleLogger;
}
