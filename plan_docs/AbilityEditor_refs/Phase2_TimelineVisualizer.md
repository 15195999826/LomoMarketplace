# Phase 2: Timeline 可视化方案

## 概述

提供 Timeline 的可视化展示，让用户直观理解技能的时间轴结构。

## 目标

- 横向时间轴展示
- Tag 节点可视化
- 点击 Tag 显示关联的 Action
- 支持缩放和拖拽

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - JSON 配置类型定义
- [Phase1_TestGameWorld.md](./Phase1_TestGameWorld.md) - TimelineRegistry 初始化

---

## UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Timeline: attack_melee                    Duration: 1000ms     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0ms        250ms       500ms       750ms        1000ms         │
│  │           │           │           │            │             │
│  ├───────────┼───────────┼───────────┼────────────┤             │
│  │           │           │           │            │             │
│  ▼           ▼           ▼                        ▼             │
│ [start]   [impact]   [recover]              [complete]          │
│  │           │                                                  │
│  │           └─── Actions: Damage, StageCue                     │
│  └─── Actions: (none)                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tag 节点样式

```
┌──────────┐
│  impact  │  ← Tag 名称
│  250ms   │  ← 时间点
│  [2]     │  ← Action 数量
└──────────┘
```

### 选中状态

```
┌──────────────────────────────────────────────────────────────┐
│  Selected Tag: impact (250ms)                                │
├──────────────────────────────────────────────────────────────┤
│  Actions:                                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Damage                                              │  │
│  │    target: eventTarget                                 │  │
│  │    formula: source.atk * 1.0                           │  │
│  │    damageType: physical                                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 2. StageCue                                            │  │
│  │    cueId: melee_slash                                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 组件设计

### TimelineVisualizer 组件

```typescript
// components/ability-editor/TimelineVisualizer.tsx

import { useState, useMemo, useCallback } from 'react';
import styles from './TimelineVisualizer.module.css';

// ========== 类型定义 ==========

export interface TimelineData {
  id: string;
  totalDuration: number;
  tags: Record<string, number>; // tagName -> time
}

export interface TagActionsData {
  [tagName: string]: ActionData[];
}

export interface ActionData {
  type: string;
  [key: string]: unknown;
}

export interface TimelineVisualizerProps {
  /** Timeline 数据 */
  timeline: TimelineData;
  /** Tag -> Actions 映射 */
  tagActions: TagActionsData;
  /** 选中的 Tag */
  selectedTag?: string;
  /** Tag 选中回调 */
  onTagSelect?: (tagName: string | null) => void;
  /** 高度 */
  height?: number;
}

// ========== 常量 ==========

const PADDING = 40;
const TAG_HEIGHT = 60;
const TAG_WIDTH = 80;
const TRACK_HEIGHT = 4;

// ========== 组件实现 ==========

export function TimelineVisualizer({
  timeline,
  tagActions,
  selectedTag,
  onTagSelect,
  height = 200,
}: TimelineVisualizerProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // ========== 计算 Tag 位置 ==========

  const tagPositions = useMemo(() => {
    const positions: Array<{
      name: string;
      time: number;
      x: number;  // 百分比 0-100
      actionCount: number;
    }> = [];

    const sortedTags = Object.entries(timeline.tags).sort(([, a], [, b]) => a - b);
    const availableWidth = 100 - PADDING * 2;  // 可用宽度

    for (const [name, time] of sortedTags) {
      // 修正坐标计算
      const x = PADDING + (time / timeline.totalDuration) * availableWidth;
      const actionCount = tagActions[name]?.length ?? 0;
      positions.push({ name, time, x, actionCount });
    }

    return positions;
  }, [timeline, tagActions]);

  // ========== 时间刻度 ==========

  const timeMarkers = useMemo(() => {
    const markers: Array<{ time: number; x: number }> = [];
    const step = timeline.totalDuration <= 1000 ? 250 : 500;
    const availableWidth = 100 - PADDING * 2;

    for (let time = 0; time <= timeline.totalDuration; time += step) {
      const x = PADDING + (time / timeline.totalDuration) * availableWidth;
      markers.push({ time, x });
    }

    return markers;
  }, [timeline.totalDuration]);

  // ========== 事件处理 ==========

  const handleTagClick = useCallback(
    (tagName: string) => {
      onTagSelect?.(selectedTag === tagName ? null : tagName);
    },
    [selectedTag, onTagSelect]
  );

  // ========== 渲染 ==========

  return (
    <div className={styles.container} style={{ height }}>
      {/* 标题栏 */}
      <div className={styles.header}>
        <span className={styles.title}>Timeline: {timeline.id}</span>
        <span className={styles.duration}>Duration: {timeline.totalDuration}ms</span>
      </div>

      {/* 时间轴主体 */}
      <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* 时间轴轨道 */}
        <line
          x1={PADDING}
          y1={50}
          x2={100 - PADDING}
          y2={50}
          className={styles.track}
        />

        {/* 时间刻度 */}
        {timeMarkers.map(({ time, x }) => (
          <g key={time}>
            <line
              x1={x}
              y1={45}
              x2={x}
              y2={55}
              className={styles.marker}
            />
            <text
              x={x}
              y={65}
              className={styles.markerLabel}
              textAnchor="middle"
            >
              {time}ms
            </text>
          </g>
        ))}

        {/* Tag 节点 */}
        {tagPositions.map(({ name, time, x, actionCount }) => {
          const isSelected = selectedTag === name;
          const isHovered = hoveredTag === name;

          return (
            <g
              key={name}
              className={styles.tagGroup}
              onClick={() => handleTagClick(name)}
              onMouseEnter={() => setHoveredTag(name)}
              onMouseLeave={() => setHoveredTag(null)}
            >
              {/* 连接线 */}
              <line
                x1={x}
                y1={50}
                x2={x}
                y2={30}
                className={styles.tagConnector}
              />

              {/* Tag 节点 */}
              <rect
                x={x - 8}
                y={10}
                width={16}
                height={20}
                rx={2}
                className={`${styles.tagNode} ${isSelected ? styles.selected : ''} ${isHovered ? styles.hovered : ''}`}
              />

              {/* Tag 名称 */}
              <text
                x={x}
                y={5}
                className={styles.tagName}
                textAnchor="middle"
              >
                {name}
              </text>

              {/* Action 数量徽章 */}
              {actionCount > 0 && (
                <g>
                  <circle
                    cx={x + 6}
                    cy={12}
                    r={3}
                    className={styles.badge}
                  />
                  <text
                    x={x + 6}
                    y={13}
                    className={styles.badgeText}
                    textAnchor="middle"
                  >
                    {actionCount}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 选中 Tag 的 Action 详情 */}
      {selectedTag && (
        <TagActionDetails
          tagName={selectedTag}
          time={timeline.tags[selectedTag]}
          actions={tagActions[selectedTag] ?? []}
        />
      )}
    </div>
  );
}

// ========== Tag Action 详情组件 ==========

interface TagActionDetailsProps {
  tagName: string;
  time: number;
  actions: ActionData[];
}

function TagActionDetails({ tagName, time, actions }: TagActionDetailsProps) {
  return (
    <div className={styles.actionDetails}>
      <div className={styles.actionDetailsHeader}>
        Selected Tag: {tagName} ({time}ms)
      </div>
      <div className={styles.actionList}>
        {actions.length === 0 ? (
          <div className={styles.noActions}>No actions</div>
        ) : (
          actions.map((action, index) => (
            <div key={index} className={styles.actionItem}>
              <div className={styles.actionType}>
                {index + 1}. {action.type}
              </div>
              <div className={styles.actionParams}>
                {Object.entries(action)
                  .filter(([key]) => key !== 'type')
                  .map(([key, value]) => (
                    <div key={key} className={styles.actionParam}>
                      <span className={styles.paramKey}>{key}:</span>
                      <span className={styles.paramValue}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### CSS 样式

```css
/* components/ability-editor/TimelineVisualizer.module.css */

.container {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.title {
  font-weight: 600;
  color: var(--text-primary);
}

.duration {
  color: var(--text-secondary);
  font-size: 0.9em;
}

.svg {
  flex: 1;
  min-height: 100px;
}

.track {
  stroke: var(--border-color);
  stroke-width: 0.5;
}

.marker {
  stroke: var(--text-tertiary);
  stroke-width: 0.2;
}

.markerLabel {
  font-size: 2px;
  fill: var(--text-tertiary);
}

.tagGroup {
  cursor: pointer;
}

.tagConnector {
  stroke: var(--accent-color);
  stroke-width: 0.3;
  stroke-dasharray: 1, 0.5;
}

.tagNode {
  fill: var(--accent-color);
  stroke: var(--accent-color-dark);
  stroke-width: 0.3;
  transition: all 0.2s ease;
}

.tagNode.selected {
  fill: var(--accent-color-bright);
  stroke-width: 0.5;
}

.tagNode.hovered {
  fill: var(--accent-color-light);
}

.tagName {
  font-size: 2px;
  fill: var(--text-primary);
  font-weight: 500;
}

.badge {
  fill: var(--warning-color);
}

.badgeText {
  font-size: 1.5px;
  fill: white;
  font-weight: bold;
}

.actionDetails {
  border-top: 1px solid var(--border-color);
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.actionDetailsHeader {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.actionList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.noActions {
  color: var(--text-tertiary);
  font-style: italic;
}

.actionItem {
  background: var(--bg-tertiary);
  border-radius: 4px;
  padding: 8px;
}

.actionType {
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: 4px;
}

.actionParams {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9em;
}

.actionParam {
  display: flex;
  gap: 8px;
}

.paramKey {
  color: var(--text-secondary);
}

.paramValue {
  color: var(--text-primary);
  font-family: monospace;
}
```

---

## 交互功能

### 1. Tag 选择

- 点击 Tag 节点选中
- 再次点击取消选中
- 选中后显示 Action 详情

### 2. 悬停提示

- 悬停显示 Tag 信息
- 高亮显示关联的 Action

### 3. 缩放（可选）

```typescript
// 可选：添加缩放功能
const [zoom, setZoom] = useState(1);

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
};
```

---

## 与编辑器联动

### 从 AbilityConfigJSON 提取 Timeline 数据

**重要**：使用 Phase 0 定义的 `AbilityConfigJSON` 类型，正确区分 `timelineId` 和 `tagActions`。

```typescript
// lib/ability-tester/utils/extractTimeline.ts

import { getTimelineRegistry } from '@lomo/logic-game-framework';
import type { AbilityConfigJSON, ActiveUseComponentJSON } from '../config/types';

export interface ExtractedTimeline {
  timeline: TimelineData;
  tagActions: TagActionsData;
  error?: string;
}

/**
 * 从 AbilityConfigJSON 提取 Timeline 数据
 *
 * 注意：
 * - timelineId: 引用 TimelineRegistry 中的 Timeline 定义（包含 tags 时间点）
 * - tagActions: 每个 tag 对应的 Action 列表
 */
export function extractTimelineFromConfig(config: AbilityConfigJSON): ExtractedTimeline | null {
  // 查找第一个 ActiveUseComponent
  const activeUse = config.activeUseComponents?.[0];
  if (!activeUse) {
    return null;
  }

  // 获取 timelineId 和 tagActions（Phase 0 定义的结构）
  const { timelineId, tagActions } = activeUse;

  // 从 TimelineRegistry 获取 Timeline 定义
  const timelineAsset = getTimelineRegistry().get(timelineId);

  if (!timelineAsset) {
    // Timeline 未找到，返回带错误信息的占位数据
    console.warn(`Timeline not found: ${timelineId}`);
    return {
      timeline: {
        id: timelineId,
        totalDuration: 1000,  // 默认值
        tags: {},
      },
      tagActions: tagActions ?? {},
      error: `Timeline "${timelineId}" not found in registry`,
    };
  }

  return {
    timeline: {
      id: timelineId,
      totalDuration: timelineAsset.totalDuration,
      tags: timelineAsset.tags,  // 从 TimelineRegistry 获取 tag 时间点
    },
    tagActions: tagActions ?? {},  // 从配置获取 tag 对应的 Actions
  };
}
```

### 在编辑器页面中使用

```typescript
// app/tools/ability-tester/page.tsx

function AbilityTesterPage() {
  const [configJson, setConfigJson] = useState(defaultConfig);
  const [parsedConfig, setParsedConfig] = useState<AbilityConfig | null>(null);

  const timelineData = useMemo(() => {
    if (!parsedConfig) return null;
    return extractTimelineFromConfig(parsedConfig);
  }, [parsedConfig]);

  return (
    <div className="ability-tester-page">
      <div className="editor-panel">
        <ConfigEditor
          value={configJson}
          onChange={setConfigJson}
          onValidationSuccess={setParsedConfig}
        />
      </div>

      {timelineData && (
        <div className="timeline-panel">
          <TimelineVisualizer
            timeline={timelineData.timeline}
            tagActions={timelineData.tagActions}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 文件结构

```
inkmon-pokedex/
└── components/
    └── ability-editor/
        ├── TimelineVisualizer.tsx
        ├── TimelineVisualizer.module.css
        └── utils/
            └── extractTimeline.ts
```

---

## 验收标准

- [ ] Timeline 正确渲染
- [ ] Tag 节点位置正确
- [ ] 点击选中功能正常
- [ ] Action 详情正确显示
- [ ] 与 ConfigEditor 联动
- [ ] 响应式布局

---

## 下一步

完成 Timeline 可视化后，进入 [Phase2_ComponentEditor.md](./Phase2_ComponentEditor.md) 实现 Component 编辑器。
