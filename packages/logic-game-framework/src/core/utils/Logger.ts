/**
 * Logger 接口定义
 * 框架提供统一 Logger 接口，游戏层可注入自定义实现
 */
export interface ILogger {
  debug(msg: string, data?: object): void;
  info(msg: string, data?: object): void;
  warn(msg: string, data?: object): void;
  error(msg: string, data?: object): void;
}

/**
 * 默认 Logger 实现（使用 console）
 */
export class ConsoleLogger implements ILogger {
  private prefix: string;

  constructor(prefix: string = '[BattleFramework]') {
    this.prefix = prefix;
  }

  debug(msg: string, data?: object): void {
    console.debug(`${this.prefix} ${msg}`, data ?? '');
  }

  info(msg: string, data?: object): void {
    console.info(`${this.prefix} ${msg}`, data ?? '');
  }

  warn(msg: string, data?: object): void {
    console.warn(`${this.prefix} ${msg}`, data ?? '');
  }

  error(msg: string, data?: object): void {
    console.error(`${this.prefix} ${msg}`, data ?? '');
  }
}

/**
 * 静默 Logger（用于测试或不需要日志的场景）
 */
export class SilentLogger implements ILogger {
  debug(_msg: string, _data?: object): void {}
  info(_msg: string, _data?: object): void {}
  warn(_msg: string, _data?: object): void {}
  error(_msg: string, _data?: object): void {}
}

// ========== 分类调试日志系统 ==========

/**
 * 日志分类
 *
 * - execution: 执行实例生命周期（激活、完成、取消）
 * - timeline: Timeline 时间轴（Tag 触发）
 * - action: Action 执行
 * - ability: Ability 生命周期（授予、移除）
 * - attribute: 属性变化（Modifier 添加/移除）
 */
export type LogCategory = 'execution' | 'timeline' | 'action' | 'ability' | 'attribute';

/**
 * 调试日志配置
 */
export type DebugLogConfig = {
  /** 是否启用调试日志 */
  enabled: boolean;
  /** 启用的日志分类（空数组 = 全部启用） */
  categories: LogCategory[];
};

/** 默认配置：关闭 */
const defaultDebugConfig: DebugLogConfig = {
  enabled: false,
  categories: [],
};

let debugConfig: DebugLogConfig = { ...defaultDebugConfig };

/**
 * 配置调试日志
 *
 * @example
 * ```typescript
 * // 启用所有分类
 * configureDebugLog({ enabled: true, categories: [] });
 *
 * // 只启用执行实例和时间轴日志
 * configureDebugLog({ enabled: true, categories: ['execution', 'timeline'] });
 *
 * // 关闭调试日志
 * configureDebugLog({ enabled: false });
 * ```
 */
export function configureDebugLog(config: Partial<DebugLogConfig>): void {
  debugConfig = { ...debugConfig, ...config };
}

/**
 * 获取当前调试日志配置
 */
export function getDebugLogConfig(): Readonly<DebugLogConfig> {
  return debugConfig;
}

/**
 * 检查分类是否启用
 */
function isCategoryEnabled(category: LogCategory): boolean {
  if (!debugConfig.enabled) return false;
  if (debugConfig.categories.length === 0) return true; // 空数组 = 全部启用
  return debugConfig.categories.includes(category);
}

/**
 * 调试日志处理器类型
 */
export type DebugLogHandler = (category: LogCategory, message: string, context?: DebugLogContext) => void;

/**
 * 调试日志上下文（可选的额外信息）
 */
export type DebugLogContext = {
  executionId?: string;
  actorId?: string;
  actorName?: string;
  abilityName?: string;
  configId?: string;
  tagName?: string;
  tagTime?: number;
  elapsed?: number;
  actions?: string[];
};

/** 自定义日志处理器 */
let customLogHandler: DebugLogHandler | null = null;

/**
 * 设置自定义日志处理器
 *
 * @example
 * ```typescript
 * setDebugLogHandler((category, message, context) => {
 *   battleLogger.log(category, message, context);
 * });
 * ```
 */
export function setDebugLogHandler(handler: DebugLogHandler | null): void {
  customLogHandler = handler;
}

/**
 * 输出调试日志
 *
 * @param category 日志分类
 * @param message 日志消息
 * @param context 可选的上下文信息
 */
export function debugLog(category: LogCategory, message: string, context?: DebugLogContext): void {
  if (!isCategoryEnabled(category)) return;

  // 调用自定义处理器
  if (customLogHandler) {
    customLogHandler(category, message, context);
  } else {
    // 默认输出到控制台
    console.log(`[${category}] ${message}`);
  }
}

// ========== 全局 Logger ==========

let globalLogger: ILogger = new ConsoleLogger();

/**
 * 设置全局 Logger
 */
export function setLogger(logger: ILogger): void {
  globalLogger = logger;
}

/**
 * 获取全局 Logger
 */
export function getLogger(): ILogger {
  return globalLogger;
}
