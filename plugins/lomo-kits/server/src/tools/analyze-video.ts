/**
 * analyze_video tool — 端到端视频分析
 *
 * 唯一对外暴露的 MCP tool，内部串行编排所有管道步骤。
 */

import { mkdir, copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VisionApiConfig, AnalyzeApiConfig, FrameExtractConfig, Classification } from '../types.js';
import { extractFrames } from '../core/frame-extract.js';
import { describeFrames } from '../core/describe-frames.js';
import { buildPrompt, analyze } from '../core/analyze.js';
import { classify } from '../core/classify.js';
import { validateStepOutput } from '../core/validate.js';
import { createLogger } from '../utils/logger.js';
import { loadVisionConfig, loadAnalyzeConfig, loadFrameExtractConfig } from '../config.js';

const log = createLogger('analyze-video');

export interface AnalyzeVideoInput {
  videoPath: string;
  subtitlePath?: string;
  outputDir?: string;
}

export interface AnalyzeVideoResult {
  outputDir: string;
  analysis: string;
  classification: Classification;
  artifacts: string[];
}

export async function analyzeVideo(
  input: AnalyzeVideoInput,
  visionConfig: VisionApiConfig,
  analyzeConfig: AnalyzeApiConfig,
  frameConfig: FrameExtractConfig,
): Promise<AnalyzeVideoResult> {
  const taskDir = input.outputDir ?? resolve(tmpdir(), `video-analyze-${Date.now()}-${randomUUID().slice(0, 8)}`);
  await mkdir(taskDir, { recursive: true });

  log.info(`开始端到端视频分析`);
  log.info(`视频: ${input.videoPath}`);
  log.info(`工作目录: ${taskDir}`);

  // 准备视频文件 — 如果不在 taskDir 中，复制一份
  const videoInTask = resolve(taskDir, 'video.mp4');
  try {
    await access(videoInTask);
  } catch {
    log.info(`复制视频到工作目录...`);
    await copyFile(input.videoPath, videoInTask);
  }

  // 准备字幕文件（可选）
  if (input.subtitlePath) {
    const subtitleInTask = resolve(taskDir, 'subtitle.json');
    try {
      await access(subtitleInTask);
    } catch {
      log.info(`复制字幕到工作目录...`);
      await copyFile(input.subtitlePath, subtitleInTask);
    }
  }

  // Step 1: 帧提取
  log.info('=== Step 1/5: 帧提取 ===');
  await extractFrames(videoInTask, taskDir, frameConfig);
  await validateStepOutput('extract', taskDir);

  // Step 2: 帧描述
  log.info('=== Step 2/5: 帧描述 ===');
  await describeFrames(taskDir, visionConfig);
  await validateStepOutput('lookat', taskDir);

  // Step 3: 构建 prompt
  log.info('=== Step 3/5: 构建分析 prompt ===');
  await buildPrompt(taskDir);
  await validateStepOutput('build-prompt', taskDir);

  // Step 4: LLM 分析
  log.info('=== Step 4/5: LLM 分析 ===');
  const analysisText = await analyze(taskDir, analyzeConfig);
  await validateStepOutput('analyze', taskDir);

  // Step 5: 分类
  log.info('=== Step 5/5: 视频分类 ===');
  const classification = await classify(taskDir, analyzeConfig);
  await validateStepOutput('classify', taskDir);

  log.info(`分析完成! 分类: ${classification.category}/${classification.subcategory}`);

  const artifacts = [
    'video.mp4',
    'frames/',
    'frame-descriptions.json',
    '.analysis-prompt.md',
    'analysis.md',
    'classification.json',
  ];
  if (input.subtitlePath) artifacts.splice(1, 0, 'subtitle.json');

  return {
    outputDir: taskDir,
    analysis: analysisText,
    classification,
    artifacts,
  };
}

/**
 * 注册 Video 分析 tools 到 MCP Server
 */
export function registerVideoTools(server: McpServer): void {
  server.tool(
    'analyze_video',
    '端到端视频分析：输入视频文件路径，自动完成帧提取、Vision 描述、LLM 分析和分类。返回完整分析报告和分类结果。',
    {
      videoPath: z.string().describe('视频文件的绝对路径'),
      subtitlePath: z.string().optional().describe('字幕文件路径（JSON 格式，可选）'),
      outputDir: z.string().optional().describe('输出目录路径（可选，默认使用临时目录）'),
    },
    async ({ videoPath, subtitlePath, outputDir }) => {
      try {
        const visionConfig = loadVisionConfig();
        const analyzeConfig = loadAnalyzeConfig();
        const frameConfig = loadFrameExtractConfig();

        const result = await analyzeVideo(
          { videoPath, subtitlePath, outputDir },
          visionConfig,
          analyzeConfig,
          frameConfig,
        );

        const summary = [
          `## 视频分析完成`,
          '',
          `**分类**: ${result.classification.category} / ${result.classification.subcategory}`,
          `**置信度**: ${result.classification.confidence}`,
          `**分类理由**: ${result.classification.reason}`,
          '',
          `**产物目录**: ${result.outputDir}`,
          `**产物列表**: ${result.artifacts.join(', ')}`,
          '',
          '---',
          '',
          result.analysis,
        ].join('\n');

        return {
          content: [{ type: 'text', text: summary }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error(`analyze_video 失败: ${msg}`);
        return {
          content: [{ type: 'text', text: `视频分析失败: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
