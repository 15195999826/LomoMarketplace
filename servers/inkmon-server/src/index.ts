#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeDatabase } from "./database/schema.js";
import { addInkMon, getNextDexNumber, getInkMonByName } from "./tools/inkmon-tools.js";
import { InkMonSchema } from "./types/inkmon.js";

// 初始化数据库
initializeDatabase();

const server = new McpServer({
  name: "inkmon-mcp",
  version: "1.0.0",
});

// 测试工具：ping
server.registerTool(
  "ping",
  {
    description: "Test tool - returns pong with the input message",
    inputSchema: {
      message: z.string().describe("Any message to echo back"),
    },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: `pong: ${message}` }],
  })
);

// add_inkmon - 添加 InkMon 到数据库
server.registerTool(
  "add_inkmon",
  {
    description: "添加 InkMon 到数据库。输入完整的 InkMon JSON 对象。",
    inputSchema: {
      inkmon: InkMonSchema,
    },
  },
  async (input) => addInkMon(input)
);

// get_next_dex_number - 获取下一个图鉴编号
server.registerTool(
  "get_next_dex_number",
  {
    description: "获取下一个可用的图鉴编号",
    inputSchema: {},
  },
  async () => getNextDexNumber()
);

// get_inkmon - 根据英文名查询
server.registerTool(
  "get_inkmon",
  {
    description: "根据英文名查询 InkMon",
    inputSchema: {
      name_en: z.string().describe("InkMon 英文名称"),
    },
  },
  async ({ name_en }) => getInkMonByName(name_en)
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InkMon MCP Server running on stdio (with database)");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
