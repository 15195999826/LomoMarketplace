/**
 * wsh/wavectl CLI 封装
 */

import { execFile } from 'node:child_process';

const WSH_BIN = "wsh";
const WAVECTL_BIN = "wavectl";
const DEFAULT_TIMEOUT = 10_000;

export function ensureBlockPrefix(id: string): string {
  return id.startsWith("block:") ? id : `block:${id}`;
}

export function stripBlockPrefix(id: string): string {
  return id.replace(/^block:/, "");
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function exec(
  bin: string,
  args: string[],
  timeout = DEFAULT_TIMEOUT,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new Error(`Command not found: ${bin}`));
          return;
        }
        resolve({
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          exitCode: error ? (error as any).code ?? 1 : 0,
        });
      },
    );
  });
}

/** Run a CLI command and return MCP-formatted result */
export async function run(
  bin: string,
  args: string[],
  timeout = DEFAULT_TIMEOUT,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const r = await exec(bin, args, timeout);
    if (r.exitCode !== 0) {
      return {
        content: [{ type: "text", text: r.stderr || `exit code ${r.exitCode}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: r.stdout }] };
  } catch (e: any) {
    return {
      content: [{ type: "text", text: e.message ?? String(e) }],
      isError: true,
    };
  }
}

export function runWsh(args: string[], timeout?: number) {
  return run(WSH_BIN, args, timeout);
}

export function runWavectl(args: string[], timeout?: number) {
  return run(WAVECTL_BIN, args, timeout);
}
