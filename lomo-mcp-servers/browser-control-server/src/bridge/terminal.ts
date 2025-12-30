/**
 * Claude Code CLI 子进程管理
 * 使用 node-pty 提供真正的伪终端支持
 */

import * as pty from "node-pty";
import { EventEmitter } from "events";

export interface ClaudeCodeManagerEvents {
  output: (data: string) => void;
  exit: (code: number | null) => void;
  error: (err: Error) => void;
}

export class ClaudeCodeManager extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private autoRestart = false;
  private cols = 80;
  private rows = 24;

  constructor() {
    super();
  }

  /**
   * 启动 Claude Code CLI
   * 使用 node-pty 提供真正的伪终端，支持：
   * - 输入回显
   * - 交互模式
   * - 彩色输出
   * - 终端尺寸调整
   */
  async start(): Promise<void> {
    if (this.ptyProcess) {
      console.log("[Terminal] Claude Code 已在运行中");
      return;
    }

    console.log("[Terminal] 启动 Claude Code CLI (PTY 模式)...");

    try {
      // 使用 node-pty 创建伪终端
      // Windows 上使用 cmd.exe 或 powershell.exe 启动
      const shell = process.platform === "win32" ? "cmd.exe" : "bash";
      const shellArgs = process.platform === "win32" ? ["/c", "claude"] : ["-c", "claude"];

      this.ptyProcess = pty.spawn(shell, shellArgs, {
        name: "xterm-256color",
        cols: this.cols,
        rows: this.rows,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: "xterm-256color",
          FORCE_COLOR: "1",
          COLORTERM: "truecolor",
        } as Record<string, string>,
      });

      // 监听 PTY 输出
      this.ptyProcess.onData((data: string) => {
        // PTY 输出已经包含回显，直接发送
        this.emit("output", data);
      });

      // 监听进程退出
      this.ptyProcess.onExit(({ exitCode }) => {
        console.log(`[Terminal] Claude Code 退出，退出码: ${exitCode}`);
        this.ptyProcess = null;
        this.emit("exit", exitCode);

        // 自动重启
        if (this.autoRestart && exitCode !== 0) {
          console.log("[Terminal] 3 秒后自动重启...");
          setTimeout(() => this.start(), 3000);
        }
      });

      console.log("[Terminal] Claude Code CLI 已启动 (PTY)");
    } catch (err) {
      console.error("[Terminal] 启动失败:", err);
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * 发送用户输入到 Claude Code
   * PTY 会自动处理回显
   */
  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    } else {
      console.warn("[Terminal] 无法发送输入：进程未启动");
    }
  }

  /**
   * 停止 Claude Code 进程
   */
  stop(): void {
    if (this.ptyProcess) {
      console.log("[Terminal] 停止 Claude Code...");
      this.autoRestart = false;

      const ptyToKill = this.ptyProcess;
      this.ptyProcess = null;

      try {
        // 先尝试正常终止
        ptyToKill.kill();

        // Windows 上 node-pty 可能需要强制终止
        if (process.platform === "win32") {
          // 获取 PID 并强制终止进程树
          const pid = ptyToKill.pid;
          if (pid) {
            try {
              // 使用 taskkill 强制终止进程树
              const { execSync } = require("child_process");
              execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
            } catch {
              // 忽略错误（进程可能已经退出）
            }
          }
        }
      } catch (err) {
        console.error("[Terminal] 停止进程时出错:", err);
      }
    }
  }

  /**
   * 检查进程是否在运行
   */
  isRunning(): boolean {
    return this.ptyProcess !== null;
  }

  /**
   * 启用自动重启机制
   */
  enableAutoRestart(): void {
    this.autoRestart = true;
    console.log("[Terminal] 已启用自动重启");
  }

  /**
   * 禁用自动重启机制
   */
  disableAutoRestart(): void {
    this.autoRestart = false;
  }

  /**
   * 健康检查
   */
  healthCheck(): boolean {
    return this.isRunning();
  }

  /**
   * 调整终端尺寸
   * node-pty 支持真正的终端尺寸调整
   */
  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.ptyProcess) {
      console.log(`[Terminal] 调整终端尺寸: ${cols}x${rows}`);
      this.ptyProcess.resize(cols, rows);
    }
  }
}
