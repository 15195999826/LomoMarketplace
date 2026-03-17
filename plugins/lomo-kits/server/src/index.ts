/**
 * lomo-kits MCP Server
 *
 * 统一入口：通过环境变量控制启用哪些模块。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('mcp');

function isEnabled(key: string, defaultVal = false): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultVal;
  return val === '1' || val.toLowerCase() === 'true';
}

const server = new McpServer({
  name: 'lomo-kits',
  version: '1.0.0',
});

// ─── Vision tools (default: enabled) ───
if (isEnabled('LOMO_ENABLE_VISION', true)) {
  const { registerVisionTools } = await import('./tools/look-at.js');
  const { registerVideoTools } = await import('./tools/analyze-video.js');
  registerVisionTools(server);
  registerVideoTools(server);
  log.info('Vision tools 已注册');
}

// ─── Lovart tools (default: disabled) ───
if (isEnabled('LOMO_ENABLE_LOVART')) {
  const { registerLovartGenerateTools } = await import('./tools/lovart-generate.js');
  const { registerLovartQueryTools } = await import('./tools/lovart-query.js');
  registerLovartGenerateTools(server);
  registerLovartQueryTools(server);
  log.info('Lovart tools 已注册');
}

// ─── Waveterm tools (default: disabled) ───
if (isEnabled('LOMO_ENABLE_WAVETERM')) {
  const { registerWshTools } = await import('./tools/wsh.js');
  registerWshTools(server);
  log.info('Waveterm tools 已注册');
}

// ─── Start ───
async function main() {
  log.info('lomo-kits MCP Server 启动中...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('MCP Server 已连接 (stdio)');
}

main().catch((err) => {
  log.error(`MCP Server 启动失败: ${err}`);
  process.exit(1);
});
