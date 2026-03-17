/**
 * 从环境变量读取配置
 */

import type { VisionApiConfig, AnalyzeApiConfig, FrameExtractConfig } from './types.js';

// ─── 模型预设 ───

let _presets: Record<string, string> | null = null;

function loadModelPresets(): Record<string, string> {
  if (_presets) return _presets;
  const raw = process.env.VISION_MODEL_PRESETS;
  if (!raw) {
    _presets = {};
    return _presets;
  }
  try {
    _presets = JSON.parse(raw);
    return _presets!;
  } catch {
    _presets = {};
    return _presets;
  }
}

/**
 * 解析模型名：先查预设映射，查不到就当完整模型名用
 */
export function resolveModel(modelOrPreset: string, defaultModel: string): string {
  if (!modelOrPreset) return defaultModel;
  const presets = loadModelPresets();
  return presets[modelOrPreset] ?? modelOrPreset;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`缺少环境变量: ${key}`);
  return val;
}

export function loadVisionConfig(): VisionApiConfig {
  return {
    baseUrl: requireEnv('VISION_API_BASE_URL'),
    apiKey: requireEnv('VISION_API_KEY'),
    model: process.env.VISION_MODEL ?? 'claude-haiku-4-5-20251001',
    maxTokens: parseInt(process.env.VISION_MAX_TOKENS ?? '512', 10),
    concurrency: parseInt(process.env.VISION_CONCURRENCY ?? '5', 10),
  };
}

export function loadAnalyzeConfig(): AnalyzeApiConfig {
  return {
    baseUrl: requireEnv('ANALYZE_API_BASE_URL'),
    apiKey: requireEnv('ANALYZE_API_KEY'),
    model: process.env.ANALYZE_MODEL ?? 'claude-sonnet-4-6-20250514',
    maxTokens: parseInt(process.env.ANALYZE_MAX_TOKENS ?? '8192', 10),
  };
}

export function loadFrameExtractConfig(): FrameExtractConfig {
  return {
    sceneThreshold: parseFloat(process.env.FRAME_SCENE_THRESHOLD ?? '0.3'),
    minInterval: parseInt(process.env.FRAME_MIN_INTERVAL ?? '20', 10),
    outputWidth: parseInt(process.env.FRAME_OUTPUT_WIDTH ?? '1280', 10),
  };
}
