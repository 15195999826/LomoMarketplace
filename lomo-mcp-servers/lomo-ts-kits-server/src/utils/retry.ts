/**
 * 指数退避重试工具
 */

import { createLogger } from './logger.js';

const log = createLogger('retry');

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  label = 'operation',
): Promise<T> {
  let lastError!: Error;

  for (let i = 0; i <= config.maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (i < config.maxRetries) {
        const delay = Math.min(config.baseDelay * 2 ** i, config.maxDelay);
        log.warn(`[${label}] 第 ${i + 1}/${config.maxRetries} 次重试，${delay}ms 后执行 — ${lastError.message}`);
        config.onRetry?.(i + 1, lastError);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
