/**
 * Battle Replay Module
 *
 * 战斗回放录制和播放模块。
 */

// 类型定义
export {
  REPLAY_PROTOCOL_VERSION,
  type IBattleRecord,
  type IBattleMeta,
  type IFrameData,
  type IActorInitData,
  type IAbilityInitData,
  type IRecordingContext,
  type IRecordableActor,
} from './ReplayTypes.js';

// 录制器
export { BattleRecorder, type IBattleRecorderConfig } from './BattleRecorder.js';

// 录像工具函数
export {
  recordAttributeChanges,
  recordAbilitySetChanges,
  recordTagChanges,
  type IAttributeChangeSubscribable,
  type ITagChangeSubscribable,
} from './RecordingUtils.js';

// 日志打印
export { ReplayLogPrinter } from './ReplayLogPrinter.js';
