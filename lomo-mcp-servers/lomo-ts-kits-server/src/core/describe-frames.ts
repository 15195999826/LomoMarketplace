/**
 * describeFrames 模块 — 使用 Vision API 批量描述帧内容
 * (原 core/look-at.ts，重命名避免与 tools/look-at.ts 混淆)
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { VisionApiConfig, FrameDescription } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('describe-frames');

const FRAME_PROMPT =
  '描述这张视频截图的画面内容，包括场景、人物、文字、动作等视觉元素。用中文回答，100字以内。';

/**
 * 调用 Vision API 描述单帧
 */
async function describeFrame(imagePath: string, config: VisionApiConfig): Promise<string> {
  const imageData = await readFile(imagePath);
  const base64 = imageData.toString('base64');

  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64,
            },
          },
          {
            type: 'text',
            text: FRAME_PROMPT,
          },
        ],
      },
    ],
  };

  const resp = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

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
 * 并发控制 — 简单 semaphore 池
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 批量描述帧 → 输出 frame-descriptions.json
 */
export async function describeFrames(taskDir: string, config: VisionApiConfig): Promise<FrameDescription[]> {
  const framesDir = resolve(taskDir, 'frames');
  const files = await readdir(framesDir);
  const pngFiles = files.filter((f) => f.endsWith('.png')).sort();

  if (pngFiles.length === 0) {
    throw new Error(`frames/ 下无 PNG 文件: ${framesDir}`);
  }

  log.info(`开始描述 ${pngFiles.length} 帧 (并发=${config.concurrency})`);

  const tasks = pngFiles.map((file, i) => async () => {
    const imagePath = resolve(framesDir, file);
    try {
      const description = await describeFrame(imagePath, config);
      log.info(`[${i + 1}/${pngFiles.length}] ${file} ✓`);
      return { frame: file, description } as FrameDescription;
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`[${i + 1}/${pngFiles.length}] ${file} ✗ ${msg}`);
      return { frame: file, description: `[ERROR] ${msg}` } as FrameDescription;
    }
  });

  const results = await runWithConcurrency(tasks, config.concurrency);

  const outPath = resolve(taskDir, 'frame-descriptions.json');
  await writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
  log.info(`帧描述已保存: ${outPath} (${results.length} 帧)`);

  const errorCount = results.filter((r) => r.description.startsWith('[ERROR]')).length;
  if (errorCount > 0) {
    log.warn(`${errorCount} 帧描述失败`);
  }

  return results;
}
