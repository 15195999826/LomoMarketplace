/**
 * look_at tool — 单张图片 goal-driven 分析
 */

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VisionApiConfig } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { resolveModel, loadVisionConfig } from '../config.js';

const log = createLogger('look-at-tool');

const MEDIA_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export interface LookAtParams {
  imagePath: string;
  goal: string;
  model?: string;
  maxTokens?: number;
}

export async function lookAtImage(
  params: LookAtParams,
  visionConfig: VisionApiConfig,
): Promise<string> {
  const { imagePath, goal, model, maxTokens } = params;

  // detect media type
  const ext = extname(imagePath).toLowerCase();
  const mediaType = MEDIA_TYPES[ext];
  if (!mediaType) {
    throw new Error(`不支持的图片格式: ${ext} (支持: ${Object.keys(MEDIA_TYPES).join(', ')})`);
  }

  // read & encode
  const imageData = await readFile(imagePath);
  const base64 = imageData.toString('base64');

  // resolve model
  const resolvedModel = model ? resolveModel(model, visionConfig.model) : visionConfig.model;
  const resolvedMaxTokens = maxTokens ?? 1024;

  log.info(`look_at: model=${resolvedModel}, maxTokens=${resolvedMaxTokens}, image=${imagePath}`);

  const body = {
    model: resolvedModel,
    max_tokens: resolvedMaxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: goal,
          },
        ],
      },
    ],
  };

  // copilot/ 前缀模型用 Bearer token，其他用 x-api-key
  const isCopilot = resolvedModel.startsWith('copilot/');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (isCopilot) {
    const copilotToken = process.env.COPILOT_AUTH_TOKEN;
    if (!copilotToken) throw new Error('Copilot 模型需要 COPILOT_AUTH_TOKEN 环境变量');
    headers['Authorization'] = `Bearer ${copilotToken}`;
  } else {
    headers['x-api-key'] = visionConfig.apiKey;
  }

  let resp: Response;
  try {
    resp = await fetch(visionConfig.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new Error(`Vision API 网络错误: ${e.message} (url=${visionConfig.baseUrl})`);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Vision API ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data.content?.[0];
  if (content?.type === 'text') return content.text;
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

/**
 * 注册 Vision tools 到 MCP Server
 */
export function registerVisionTools(server: McpServer): void {
  server.tool(
    'look_at',
    '图片分析：输入图片路径和分析目标，使用 Vision 模型回答。支持 PNG/JPG/WebP/GIF。可指定模型预设名（如 "flash"）或完整模型名。',
    {
      imagePath: z.string().describe('图片文件的绝对路径'),
      goal: z.string().describe('分析目标（你想从图片中了解什么）'),
      model: z.string().optional().describe('模型预设名（如 "flash", "gemini-pro", "haiku", "sonnet"）或完整模型名'),
      maxTokens: z.number().optional().describe('最大输出 token 数（默认 1024）'),
    },
    async ({ imagePath, goal, model, maxTokens }) => {
      try {
        const visionConfig = loadVisionConfig();
        const text = await lookAtImage({ imagePath, goal, model, maxTokens }, visionConfig);
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error(`look_at 失败: ${msg}`);
        return {
          content: [{ type: 'text', text: `图片分析失败: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
