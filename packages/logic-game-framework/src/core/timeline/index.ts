/**
 * 时间轴模块
 *
 * 导出时间轴相关的类型和工具函数。
 */

export {
  type TimelineAsset,
  type ITimelineRegistry,
  TimelineRegistry,
  getTimelineRegistry,
  setTimelineRegistry,
  getTagTime,
  getTagNames,
  getSortedTags,
  validateTimeline,
} from './Timeline.js';
