/**
 * Replay 模块导出
 *
 * 战斗回放系统，提供：
 * - 回放类型定义
 * - 战斗录制器
 * - 文件管理器
 */

// 类型定义
export {
  REPLAY_PROTOCOL_VERSION,
  type IBattleReplay,
  type IReplayMeta,
  type IReplayConfig,
  type IUnitInitData,
  type IAttributeSnapshot,
  type IRoundData,
  type ITurnData,
  type ICommandRecord,
  type IRoundEndSnapshot,
  type IBattleStatistics,
  type ITeamStatistics,
  type IUnitStatistics,
  commandToRecord,
} from "./ReplayTypes.js";

// 录制器
export {
  BattleReplayRecorder,
  createBattleReplayRecorder,
  type IBattleReplayRecorderConfig,
} from "./BattleReplayRecorder.js";

// 文件管理器
export {
  ReplayFileManager,
  createReplayFileManager,
  type IReplayFileManagerConfig,
  type IReplayFileInfo,
} from "./ReplayFileManager.js";
