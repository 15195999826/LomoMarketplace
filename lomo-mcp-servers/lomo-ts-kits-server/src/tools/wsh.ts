/**
 * Waveterm tools — 10 个 wsh/wavectl tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ensureBlockPrefix, stripBlockPrefix, runWsh, runWavectl } from '../clients/wsh.js';

export function registerWshTools(server: McpServer): void {
  // 1. wsh_run
  server.tool(
    "wsh_run",
    "Run a command in a new Wave Terminal block. Returns the block ID.",
    {
      command: z.string().describe("Shell command to execute (run via `cmd /c`)"),
      cwd: z.string().optional().describe("Working directory"),
    },
    async ({ command, cwd }) => {
      const args = ["run", "--", "cmd", "/c", command];
      if (cwd) args.splice(1, 0, "--cwd", cwd);
      return runWsh(args);
    },
  );

  // 2. wsh_read_output
  server.tool(
    "wsh_read_output",
    "Read terminal scrollback buffer of a block (last N lines)." +
      " WARNING: Large buffers (>1000 lines) may timeout when reading from tail." +
      " Use positive 'start' to skip early content for faster reads on large buffers.",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      lines: z.number().default(50).describe("Number of lines to read (default 50)"),
      start: z
        .number()
        .optional()
        .describe(
          "Starting line number. " +
            "Positive: absolute offset from top (e.g. 1990 = skip first 1990 lines). " +
            "Negative: offset from end (e.g. -50 = last 50 lines, may be slow on large buffers). " +
            "Omitted: same as negative `lines` (read from tail).",
        ),
    },
    async ({ blockId, lines, start }) => {
      const id = ensureBlockPrefix(blockId);
      const offset = start ?? -lines;
      const result = await runWsh(
        ["termscrollback", "-b", id, "--start", String(offset)],
        30_000,
      );
      // When using positive start, wsh returns everything from that line to end.
      // Trim to requested line count.
      if (!result.isError && offset >= 0 && result.content[0]) {
        const text = result.content[0].text;
        const trimmed = text.split("\n").slice(0, lines).join("\n");
        result.content[0].text = trimmed;
      }
      return result;
    },
  );

  // 3. wsh_send_input
  server.tool(
    "wsh_send_input",
    "Send text input followed by Enter to a block (via wavectl type).",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      text: z.string().describe("Text to type (Enter is sent automatically)"),
    },
    async ({ blockId, text }) => {
      const id = stripBlockPrefix(blockId);
      return runWavectl(["type", id, text]);
    },
  );

  // 4. wsh_send_keys
  server.tool(
    "wsh_send_keys",
    'Send arbitrary key tokens to a block (e.g. "enter", "ctrl+c", "text:hello").',
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      keys: z.array(z.string()).describe('Key tokens, e.g. ["ctrl+c", "enter"]'),
    },
    async ({ blockId, keys }) => {
      const id = stripBlockPrefix(blockId);
      return runWavectl(["send", id, ...keys]);
    },
  );

  // 5. wsh_select
  server.tool(
    "wsh_select",
    "Select the Nth interactive option in a block (1-indexed).",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      option: z.number().describe("Option number (1-indexed)"),
    },
    async ({ blockId, option }) => {
      const id = stripBlockPrefix(blockId);
      return runWavectl(["select", id, String(option)]);
    },
  );

  // 6. wsh_block_info
  server.tool(
    "wsh_block_info",
    "Get metadata (JSON) of a block. Useful for checking if a block is alive.",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
    },
    async ({ blockId }) => {
      const id = ensureBlockPrefix(blockId);
      return runWsh(["getmeta", "-b", id]);
    },
  );

  // 7. wsh_delete_block
  server.tool(
    "wsh_delete_block",
    "Delete (close) a block. Always specify the block ID explicitly.",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
    },
    async ({ blockId }) => {
      const id = ensureBlockPrefix(blockId);
      return runWsh(["deleteblock", "-b", id]);
    },
  );

  // 8. wsh_set_var
  server.tool(
    "wsh_set_var",
    "Set a variable on a block.",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      key: z.string().describe("Variable name"),
      value: z.string().describe("Variable value"),
    },
    async ({ blockId, key, value }) => {
      const id = ensureBlockPrefix(blockId);
      return runWsh(["setvar", "-b", id, `${key}=${value}`]);
    },
  );

  // 9. wsh_get_var
  server.tool(
    "wsh_get_var",
    "Get a variable from a block.",
    {
      blockId: z.string().describe("Block ID (UUID or block:UUID)"),
      key: z.string().describe("Variable name"),
    },
    async ({ blockId, key }) => {
      const id = ensureBlockPrefix(blockId);
      return runWsh(["getvar", "-b", id, key]);
    },
  );

  // 10. wsh_notify
  server.tool(
    "wsh_notify",
    "Send a desktop notification via Wave Terminal.",
    {
      message: z.string().describe("Notification message"),
    },
    async ({ message }) => {
      return runWsh(["notify", message]);
    },
  );
}
