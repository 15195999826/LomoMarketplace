/**
 * Claude Code CLI 子进程管理
 * 启动和管理 Claude Code CLI 作为后台子进程
 */

import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface ClaudeCodeManagerEvents {
  output: (data: string) => void;
  exit: (code: number | null) => void;
  error: (err: Error) => void;
}

export class ClaudeCodeManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private autoRestart = false;

  constructor() {
    super();
  }

  /**
   * 启动 Claude Code CLI 作为后台子进程
   * - 不显示 cmd 窗口（Windows）
   * - 通过 stdin/stdout 进行通信
   */
  async start(): Promise<void> {
    if (this.process) {
      console.log("[Terminal] Claude Code 已在运行中");
      return;
    }

    console.log("[Terminal] 启动 Claude Code CLI...");

    // 使用 spawn 启动 claude 命令
    this.process = spawn("claude", [], {
      stdio: ["pipe", "pipe", "pipe"], // 管道控制输入输出
      shell: true, // 通过 shell 启动（Windows 需要）
      windowsHide: true, // Windows 下隐藏窗口
      env: {
        ...process.env,
        // 设置终端类型，让 claude 输出彩色
        TERM: "xterm-256color",
        // 强制启用颜色输出
        FORCE_COLOR: "1",
      },
    });

    // 监听 Claude Code 的标准输出
    this.process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      console.log("[Terminal] stdout:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
      this.emit("output", text);
    });

    // 监听 Claude Code 的错误输出（也发送到终端显示）
    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      console.log("[Terminal] stderr:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
      this.emit("output", text);
    });

    // 监听进程退出
    this.process.on("exit", (code) => {
      console.log(`[Terminal] Claude Code 退出，退出码: ${code}`);
      this.process = null;
      this.emit("exit", code);

      // 自动重启
      if (this.autoRestart && code !== 0) {
        console.log("[Terminal] 3 秒后自动重启...");
        setTimeout(() => this.start(), 3000);
      }
    });

    // 监听进程错误
    this.process.on("error", (err) => {
      console.error("[Terminal] 进程错误:", err);
      this.emit("error", err);
    });

    console.log("[Terminal] Claude Code CLI 已启动");
  }

  /**
   * 发送用户输入到 Claude Code
   * 相当于用户在 cmd 里打字
   */
  write(data: string): void {
    if (this.process?.stdin) {
      console.log("[Terminal] 发送输入:", data.replace(/\n/g, "\\n").substring(0, 50));
      this.process.stdin.write(data);
    } else {
      console.warn("[Terminal] 无法发送输入：进程未启动");
    }
  }

  /**
   * 停止 Claude Code 进程
   */
  stop(): void {
    if (this.process) {
      console.log("[Terminal] 停止 Claude Code...");
      this.autoRestart = false;
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * 检查进程是否在运行
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * 启用自动重启机制
   * 如果 Claude Code 意外退出，自动重启
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
   * 注意：使用 spawn 的标准 stdio 不支持 resize，
   * 如果需要真正的 PTY 支持，需要使用 node-pty
   */
  resize(_cols: number, _rows: number): void {
    // spawn 的 stdio 不支持 resize
    // 如果需要真正的终端尺寸调整，需要使用 node-pty
    console.log(`[Terminal] resize 被调用 (cols=${_cols}, rows=${_rows})，但 spawn 不支持`);
  }
}
