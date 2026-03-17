/**
 * ffmpeg 关键帧提取模块
 *
 * 混合策略：场景变化检测 + 最小间隔兜底
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FrameExtractConfig, FrameExtractResult } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('frame-extract');

/**
 * 获取视频时长（秒）
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        videoPath,
      ],
      { timeout: 10_000, windowsHide: true },
      (error, stdout) => {
        if (error) return reject(new Error(`ffprobe 失败: ${error.message}`));
        const duration = parseFloat(stdout.trim());
        if (isNaN(duration)) return reject(new Error('无法解析视频时长'));
        resolve(duration);
      },
    );
  });
}

/**
 * 从视频中提取关键帧
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  config: FrameExtractConfig,
  options?: {
    sceneThreshold?: number;
    minInterval?: number;
    outputWidth?: number;
  },
): Promise<FrameExtractResult> {
  const sceneThreshold = options?.sceneThreshold ?? config.sceneThreshold;
  const minInterval = options?.minInterval ?? config.minInterval;
  const outputWidth = options?.outputWidth ?? config.outputWidth;

  const framesDir = resolve(outputDir, 'frames');
  await mkdir(framesDir, { recursive: true });

  const duration = await getVideoDuration(videoPath);
  log.info(`视频时长: ${Math.round(duration)}s`);

  const selectFilter = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${minInterval})'`;
  const scaleFilter = `scale=${outputWidth}:-1`;
  const vf = `${selectFilter},${scaleFilter}`;

  log.info(`开始帧提取: threshold=${sceneThreshold}, interval=${minInterval}s, width=${outputWidth}`);

  const outputPattern = resolve(framesDir, 'frame_%04d.png');

  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-i', videoPath,
        '-vf', vf,
        '-vsync', 'vfr',
        '-q:v', '2',
        outputPattern,
        '-y',
      ],
      {
        timeout: 5 * 60 * 1000,
        windowsHide: true,
      },
      (error, _stdout, stderr) => {
        if (error) {
          log.error(`ffmpeg stderr: ${stderr}`);
          return reject(new Error(`ffmpeg 帧提取失败: ${error.message}`));
        }
        resolve();
      },
    );
  });

  const files = await readdir(framesDir);
  const frameFiles = files.filter((f) => f.startsWith('frame_') && f.endsWith('.png')).sort();

  log.info(`帧提取完成: ${frameFiles.length} 帧 (${Math.round(duration)}s 视频)`);

  return {
    framesDir,
    frameCount: frameFiles.length,
    frameFiles,
  };
}

/**
 * 从 workspace 标准路径提取帧
 */
export async function extractFramesFromWorkspace(
  taskDir: string,
  config: FrameExtractConfig,
): Promise<FrameExtractResult> {
  const videoPath = resolve(taskDir, 'video.mp4');
  return extractFrames(videoPath, taskDir, config);
}
