/**
 * 共享类型定义
 */

// ─── 字幕 ───

export interface SubtitleEntry {
  from: number;   // 开始时间（秒）
  to: number;     // 结束时间（秒）
  content: string; // 字幕文本
}

export interface SubtitleResult {
  language: string;
  entries: SubtitleEntry[];
}

// ─── 帧提取 ───

export interface FrameExtractResult {
  framesDir: string;
  frameCount: number;
  frameFiles: string[];
}

export interface FrameExtractConfig {
  sceneThreshold: number;
  minInterval: number;
  outputWidth: number;
}

// ─── 帧描述 ───

export interface FrameDescription {
  frame: string;
  description: string;
}

export interface VisionApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  concurrency: number;
}

// ─── 分析 ───

export interface AnalyzeApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

// ─── 分类 ───

export type VideoCategory = 'tutorial' | 'non-tutorial';
export type VideoSubcategory =
  | 'coding-tutorial'
  | 'design-tutorial'
  | 'data-tutorial'
  | 'vlog'
  | 'music'
  | 'story'
  | 'review'
  | 'other';

export interface Classification {
  category: VideoCategory;
  subcategory: VideoSubcategory;
  confidence: number;
  reason: string;
}
