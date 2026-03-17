/**
 * 多模态分析模块
 *
 * build-prompt: 帧描述 + 字幕 → .analysis-prompt.md
 * analyze: .analysis-prompt.md → LLM → analysis.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AnalyzeApiConfig, SubtitleResult, FrameDescription } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('analyze');

/**
 * 构建分析 prompt 文本
 */
function buildPromptText(
  subtitles: SubtitleResult | null,
  frameDescriptions: FrameDescription[],
): string {
  const parts: string[] = [
    '你是一个视频内容分析专家。请根据以下视频的帧描述和字幕内容，生成结构化的分析报告。',
    '',
    '## 任务',
    '1. 根据帧描述理解视频的视觉内容和场景变化',
    '2. 结合字幕和画面描述，提取关键步骤和技术要点',
    '3. 总结视频的教程价值',
    '',
  ];

  if (subtitles && subtitles.entries.length > 0) {
    parts.push('## 字幕内容');
    parts.push('```');
    for (const entry of subtitles.entries) {
      const m = Math.floor(entry.from / 60);
      const s = Math.floor(entry.from % 60);
      parts.push(`[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}] ${entry.content}`);
    }
    parts.push('```');
    parts.push('');
  } else {
    parts.push('> 注意：此视频无字幕，请仅根据帧描述分析。');
    parts.push('');
  }

  parts.push('## 关键帧描述');
  parts.push(`共 ${frameDescriptions.length} 帧`);
  parts.push('');
  for (const fd of frameDescriptions) {
    if (fd.description.startsWith('[ERROR]')) {
      parts.push(`- **${fd.frame}**: _(描述失败)_`);
    } else {
      parts.push(`- **${fd.frame}**: ${fd.description}`);
    }
  }
  parts.push('');

  parts.push('## 输出要求');
  parts.push('将完整分析报告输出，包含：');
  parts.push('1. **视频概述**：主题、时长、目标受众');
  parts.push('2. **内容大纲**：按时间线列出关键章节（结合画面描述和字幕）');
  parts.push('3. **视觉分析**：描述视频画面中的关键视觉元素、场景变化、人物动作');
  parts.push('4. **技术要点**：提取视频中的核心技术/操作步骤（如有）');
  parts.push('5. **资源清单**：视频中提到或展示的工具、库、链接');
  parts.push('6. **可复现元素清单**（仅教程/操作类视频需要，非教程视频可跳过此节）：');
  parts.push('   - 使用的技术栈和版本号');
  parts.push('   - 每个操作步骤的精确描述（输入→操作→输出）');
  parts.push('   - 最终产出物的完整规格（文件类型、结构、功能列表）');
  parts.push('   - 必须的外部资源（API、数据集、素材）');
  parts.push('7. **复现难度评估**（仅教程/操作类视频需要）：');
  parts.push('   - 难度等级（简单/中等/困难）');
  parts.push('   - 预估所需 Agent 数量和角色分工');
  parts.push('   - 核心难点和潜在阻塞点');

  return parts.join('\n');
}

/**
 * Step: build-prompt
 * 读取帧描述 + 字幕 → 生成 .analysis-prompt.md
 */
export async function buildPrompt(taskDir: string): Promise<string> {
  log.info('构建分析 prompt...');

  let subtitles: SubtitleResult | null = null;
  try {
    const text = await readFile(resolve(taskDir, 'subtitle.json'), 'utf-8');
    subtitles = JSON.parse(text);
    log.info(`字幕已加载: ${subtitles!.entries.length} 条`);
  } catch {
    log.warn('无字幕文件');
  }

  let frameDescriptions: FrameDescription[] = [];
  try {
    const text = await readFile(resolve(taskDir, 'frame-descriptions.json'), 'utf-8');
    frameDescriptions = JSON.parse(text);
    log.info(`帧描述已加载: ${frameDescriptions.length} 帧`);
  } catch {
    throw new Error('无帧描述文件，请先运行 lookAt 步骤');
  }

  const prompt = buildPromptText(subtitles, frameDescriptions);
  const promptPath = resolve(taskDir, '.analysis-prompt.md');
  await writeFile(promptPath, prompt, 'utf-8');
  log.info(`prompt 已保存: ${promptPath} (${prompt.length} 字符)`);

  return prompt;
}

/**
 * Step: analyze
 * 读取 .analysis-prompt.md → 调 LLM → 生成 analysis.md
 */
export async function analyze(taskDir: string, config: AnalyzeApiConfig): Promise<string> {
  const promptPath = resolve(taskDir, '.analysis-prompt.md');
  let prompt: string;
  try {
    prompt = await readFile(promptPath, 'utf-8');
  } catch {
    throw new Error('无 .analysis-prompt.md，请先运行 build-prompt 步骤');
  }
  log.info(`prompt 已加载 (${prompt.length} 字符)`);

  log.info(`调用分析模型: ${config.model}`);
  const resp = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Analyze API ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data.content?.[0];
  if (content?.type !== 'text') {
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  }

  const report = content.text;
  const outPath = resolve(taskDir, 'analysis.md');
  await writeFile(outPath, report, 'utf-8');
  log.info(`分析报告已保存: ${outPath} (${report.length} 字符)`);

  return report;
}
