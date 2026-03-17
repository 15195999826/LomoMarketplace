/**
 * 视频分类模块
 *
 * 读取 analysis.md，调用 LLM 判断视频类型
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AnalyzeApiConfig, Classification } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('classify');

const CLASSIFY_PROMPT = `你是视频内容分类器。根据以下视频分析报告，判断视频类型。

分类规则：
- tutorial（教程类）：包含可复现的操作步骤、代码编写、工具使用演示、设计教程等
  - coding-tutorial：编程/开发教程
  - design-tutorial：设计/UI/UX 教程
  - data-tutorial：数据分析/可视化教程
- non-tutorial（非教程类）：故事、音乐、评测、日常等不含可复现操作的内容
  - vlog：日常/记录类
  - music：音乐/MV
  - story：故事/剧情
  - review：评测/测评
  - other：其他非教程内容

严格输出 JSON，不要输出任何其他文字：
{
  "category": "tutorial" | "non-tutorial",
  "subcategory": "上述子类之一",
  "confidence": 0.0-1.0,
  "reason": "一句话解释分类依据"
}

视频分析报告：
`;

/**
 * 分类视频内容
 */
export async function classify(taskDir: string, config: AnalyzeApiConfig): Promise<Classification> {
  const analysisPath = resolve(taskDir, 'analysis.md');
  let analysis: string;
  try {
    analysis = await readFile(analysisPath, 'utf-8');
  } catch {
    throw new Error('无 analysis.md，请先运行 analyze 步骤');
  }

  log.info(`分类中... analysis.md 长度: ${analysis.length}`);

  const prompt = CLASSIFY_PROMPT + analysis;

  const resp = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Classify API ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data.content?.[0];
  if (content?.type !== 'text') {
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  }

  const classification = parseClassification(content.text);

  const outPath = resolve(taskDir, 'classification.json');
  await writeFile(outPath, JSON.stringify(classification, null, 2), 'utf-8');
  log.info(`分类完成: ${classification.category}/${classification.subcategory} (${classification.confidence}) — ${classification.reason}`);

  return classification;
}

/**
 * 解析 LLM 返回的分类 JSON
 */
function parseClassification(raw: string): Classification {
  let jsonStr = raw.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`无法从分类输出中提取 JSON: ${raw.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const validCategories = ['tutorial', 'non-tutorial'];
  const validSubcategories = [
    'coding-tutorial', 'design-tutorial', 'data-tutorial',
    'vlog', 'music', 'story', 'review', 'other',
  ];

  if (!validCategories.includes(parsed.category)) {
    throw new Error(`无效的 category: ${parsed.category}`);
  }
  if (!validSubcategories.includes(parsed.subcategory)) {
    parsed.subcategory = parsed.category === 'tutorial' ? 'coding-tutorial' : 'other';
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.5;
  }
  if (typeof parsed.reason !== 'string') {
    parsed.reason = '';
  }

  return parsed as Classification;
}
