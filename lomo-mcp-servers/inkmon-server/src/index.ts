#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 从 @inkmon/core 导入
import {
  initializeDatabase,
  getInkMonByNameEn,
  listInkMonNamesEn,
  getNextDexNumber,
  // 文件操作函数
  listLocalInkMonFiles,
  compareInkMon,
  batchCompareInkMons,
  syncInkMonFromFile,
} from "@inkmon/core";

// 初始化数据库
initializeDatabase();

const server = new McpServer({
  name: "inkmon-mcp",
  version: "1.2.0",
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

// get_next_dex_number - 获取下一个图鉴编号
server.registerTool(
  "get_next_dex_number",
  {
    description: "获取下一个可用的图鉴编号",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: `${getNextDexNumber()}` }]
  })
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
  async ({ name_en }) => {
    const inkmon = getInkMonByNameEn(name_en);
    if (!inkmon) {
      return {
        content: [{ type: "text", text: `[ERROR] 未找到 InkMon: ${name_en}` }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ inkmon }, null, 2) }]
    };
  }
);

// list_inkmons_name_en - 列出数据库中所有英文名
server.registerTool(
  "list_inkmons_name_en",
  {
    description: "列出数据库中所有 InkMon 的英文名称",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify(listInkMonNamesEn()) }]
  })
);

// list_local_files - 列出本地 JSON 文件
server.registerTool(
  "list_local_files",
  {
    description: "列出 data/inkmons/ 目录中所有 InkMon JSON 文件名",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify(listLocalInkMonFiles()) }]
  })
);

// compare_inkmon - 比较文件和数据库
server.registerTool(
  "compare_inkmon",
  {
    description: "比较 data/inkmons/ 目录中的 JSON 文件与数据库中的数据是否一致",
    inputSchema: {
      name_en: z.string().describe("InkMon 英文名称"),
    },
  },
  async ({ name_en }) => {
    const result = compareInkMon(name_en);
    if (!result.success) {
      return {
        content: [{ type: "text", text: `[ERROR] ${result.error}` }]
      };
    }

    const { status, differences } = result.result!;
    let text = `[${name_en}] 状态: ${status}`;

    if (status === "different" && differences) {
      text += `\n差异 (${differences.length} 处):`;
      for (const diff of differences) {
        text += `\n  - ${diff.path}: 文件=${JSON.stringify(diff.fileValue)} | 数据库=${JSON.stringify(diff.dbValue)}`;
      }
    }

    return { content: [{ type: "text", text }] };
  }
);

// batch_compare - 批量比较所有文件
server.registerTool(
  "batch_compare",
  {
    description: "批量比较 data/inkmons/ 目录中所有文件与数据库的一致性，返回差异摘要",
    inputSchema: {},
  },
  async () => {
    const results = batchCompareInkMons();

    const summary = {
      total: results.length,
      identical: 0,
      different: 0,
      not_in_db: 0,
      items: [] as { name_en: string; status: string; diff_count?: number }[],
    };

    for (const item of results) {
      const { status, differences } = item.result;
      if (status === "identical") summary.identical++;
      else if (status === "different") summary.different++;
      else if (status === "not_in_db") summary.not_in_db++;

      // 只输出非一致的项
      if (status !== "identical") {
        summary.items.push({
          name_en: item.nameEn,
          status,
          diff_count: differences?.length,
        });
      }
    }

    let text = `📊 批量比较结果\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `总计: ${summary.total} | ✅一致: ${summary.identical} | 🔄差异: ${summary.different} | 🆕未入库: ${summary.not_in_db}\n`;

    if (summary.items.length > 0) {
      text += `\n需处理:\n`;
      for (const item of summary.items) {
        const icon = item.status === "not_in_db" ? "🆕" : "🔄";
        text += `  ${icon} ${item.name_en}`;
        if (item.diff_count) text += ` (${item.diff_count}处差异)`;
        text += "\n";
      }
    } else {
      text += `\n✅ 所有文件与数据库一致！`;
    }

    return { content: [{ type: "text", text }] };
  }
);

// sync_inkmon - 同步单个文件到数据库
server.registerTool(
  "sync_inkmon",
  {
    description: "同步单个 InkMon 文件到数据库。自动判断是新增还是更新，一致则跳过。",
    inputSchema: {
      name_en: z.string().describe("InkMon 英文名称"),
    },
  },
  async ({ name_en }) => {
    const result = syncInkMonFromFile(name_en);
    const icons = { added: "✅", updated: "🔄", skipped: "⏭️", failed: "❌" };
    const icon = icons[result.action];
    return {
      content: [{ type: "text", text: `${icon} [${name_en}] ${result.action}: ${result.message}` }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InkMon MCP Server v1.2.0 running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
