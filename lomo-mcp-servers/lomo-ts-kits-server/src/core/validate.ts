/**
 * 管道输出验证
 */

import { stat, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createLogger } from '../utils/logger.js';

const log = createLogger('validate');

export class ValidationError extends Error {
  constructor(
    public step: string,
    message: string,
  ) {
    super(`[${step}] 验证失败: ${message}`);
    this.name = 'ValidationError';
  }
}

interface FileRule {
  path: string;
  minSize?: number;
  contentCheck?: (content: Buffer) => boolean;
  errorHint?: string;
}

interface DirRule {
  path: string;
  minFiles: number;
  pattern?: RegExp;
  errorHint?: string;
}

type StepRules = {
  files?: FileRule[];
  dirs?: DirRule[];
};

const RULES: Record<string, StepRules> = {
  download: {
    files: [
      { path: 'video.mp4', minSize: 500_000, errorHint: '视频文件过小（< 500KB），可能下载失败' },
    ],
  },

  extract: {
    dirs: [
      { path: 'frames', minFiles: 3, pattern: /\.png$/i, errorHint: '关键帧少于 3 张' },
    ],
  },

  lookat: {
    files: [
      {
        path: 'frame-descriptions.json',
        minSize: 100,
        contentCheck: (buf) => {
          try { JSON.parse(buf.toString()); return true; } catch { return false; }
        },
        errorHint: 'frame-descriptions.json 不是有效 JSON',
      },
    ],
  },

  'build-prompt': {
    files: [
      { path: '.analysis-prompt.md', minSize: 200, errorHint: '分析 prompt 过短（< 200B）' },
    ],
  },

  analyze: {
    files: [
      {
        path: 'analysis.md',
        minSize: 500,
        contentCheck: (buf) => buf.toString().includes('##'),
        errorHint: 'analysis.md 过短或缺少 ## 标题结构',
      },
    ],
  },

  classify: {
    files: [
      {
        path: 'classification.json',
        minSize: 50,
        contentCheck: (buf) => {
          try {
            const obj = JSON.parse(buf.toString());
            return obj.category && obj.subcategory;
          } catch { return false; }
        },
        errorHint: 'classification.json 无效或缺少 category/subcategory 字段',
      },
    ],
  },
};

export async function validateStepOutput(step: string, taskDir: string): Promise<void> {
  const rules = RULES[step];
  if (!rules) return;

  if (rules.files) {
    for (const rule of rules.files) {
      const filePath = resolve(taskDir, rule.path);
      let fileStat;
      try {
        fileStat = await stat(filePath);
      } catch {
        throw new ValidationError(step, `文件不存在: ${rule.path}`);
      }

      if (rule.minSize && fileStat.size < rule.minSize) {
        throw new ValidationError(step, rule.errorHint ?? `${rule.path} 大小 ${fileStat.size}B < ${rule.minSize}B`);
      }

      if (rule.contentCheck) {
        const content = await readFile(filePath);
        if (!rule.contentCheck(content)) {
          throw new ValidationError(step, rule.errorHint ?? `${rule.path} 内容校验失败`);
        }
      }
    }
  }

  if (rules.dirs) {
    for (const rule of rules.dirs) {
      const dirPath = resolve(taskDir, rule.path);
      let entries: string[];
      try {
        entries = await readdir(dirPath);
      } catch {
        throw new ValidationError(step, `目录不存在: ${rule.path}`);
      }

      const matched = rule.pattern ? entries.filter((e) => rule.pattern!.test(e)) : entries;
      if (matched.length < rule.minFiles) {
        throw new ValidationError(
          step,
          rule.errorHint ?? `${rule.path} 匹配文件数 ${matched.length} < ${rule.minFiles}`,
        );
      }
    }
  }

  log.info(`[${step}] 输出验证通过 (taskDir=${taskDir})`);
}
