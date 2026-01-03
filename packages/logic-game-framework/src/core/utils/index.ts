export {
  ILogger,
  ConsoleLogger,
  SilentLogger,
  setLogger,
  getLogger,
  // 调试日志
  LogCategory,
  DebugLogConfig,
  DebugLogHandler,
  DebugLogContext,
  configureDebugLog,
  getDebugLogConfig,
  setDebugLogHandler,
  debugLog,
} from './Logger.js';
export { IdGenerator, generateId, resetIdCounter } from './IdGenerator.js';
