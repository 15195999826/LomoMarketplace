/**
 * Claude Code CLI 子进程管理
 * 启动和管理 Claude Code CLI 作为后台子进程
 */
import { EventEmitter } from "events";
export interface ClaudeCodeManagerEvents {
    output: (data: string) => void;
    exit: (code: number | null) => void;
    error: (err: Error) => void;
}
export declare class ClaudeCodeManager extends EventEmitter {
    private process;
    private autoRestart;
    constructor();
    /**
     * 启动 Claude Code CLI 作为后台子进程
     * - 不显示 cmd 窗口（Windows）
     * - 通过 stdin/stdout 进行通信
     */
    start(): Promise<void>;
    /**
     * 发送用户输入到 Claude Code
     * 相当于用户在 cmd 里打字
     */
    write(data: string): void;
    /**
     * 停止 Claude Code 进程
     */
    stop(): void;
    /**
     * 检查进程是否在运行
     */
    isRunning(): boolean;
    /**
     * 启用自动重启机制
     * 如果 Claude Code 意外退出，自动重启
     */
    enableAutoRestart(): void;
    /**
     * 禁用自动重启机制
     */
    disableAutoRestart(): void;
    /**
     * 健康检查
     */
    healthCheck(): boolean;
    /**
     * 调整终端尺寸
     * 注意：使用 spawn 的标准 stdio 不支持 resize，
     * 如果需要真正的 PTY 支持，需要使用 node-pty
     */
    resize(_cols: number, _rows: number): void;
}
//# sourceMappingURL=terminal.d.ts.map