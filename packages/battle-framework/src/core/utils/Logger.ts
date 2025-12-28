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

// 全局 Logger 实例
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
