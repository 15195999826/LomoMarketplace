'use client';

import { useState, useMemo, useCallback } from 'react';
import styles from './TimelineVisualizer.module.css';

export interface TimelineData {
  id: string;
  totalDuration: number;
  tags: Record<string, number>;
}

export interface TagActionsData {
  [tagName: string]: ActionData[];
}

export interface ActionData {
  type: string;
  [key: string]: unknown;
}

export interface TimelineVisualizerProps {
  timeline: TimelineData;
  tagActions: TagActionsData;
  selectedTag?: string;
  onTagSelect?: (tagName: string | null) => void;
  height?: number;
}

const PADDING = 10;

export function TimelineVisualizer({
  timeline,
  tagActions,
  selectedTag,
  onTagSelect,
  height = 200,
}: TimelineVisualizerProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const tagPositions = useMemo(() => {
    const positions: Array<{
      name: string;
      time: number;
      x: number;
      actionCount: number;
    }> = [];

    const sortedTags = Object.entries(timeline.tags).sort(([, a], [, b]) => a - b);
    const availableWidth = 100 - PADDING * 2;

    for (const [name, time] of sortedTags) {
      const x = PADDING + (time / timeline.totalDuration) * availableWidth;
      const actionCount = tagActions[name]?.length ?? 0;
      positions.push({ name, time, x, actionCount });
    }

    return positions;
  }, [timeline, tagActions]);

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

  const handleTagClick = useCallback(
    (tagName: string) => {
      onTagSelect?.(selectedTag === tagName ? null : tagName);
    },
    [selectedTag, onTagSelect]
  );

  return (
    <div className={styles.container} style={{ height }}>
      <div className={styles.header}>
        <span className={styles.title}>Timeline: {timeline.id}</span>
        <span className={styles.duration}>Duration: {timeline.totalDuration}ms</span>
      </div>

      <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1={PADDING}
          y1={50}
          x2={100 - PADDING}
          y2={50}
          className={styles.track}
        />

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

        {tagPositions.map(({ name, x, actionCount }) => {
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
              <line
                x1={x}
                y1={50}
                x2={x}
                y2={30}
                className={styles.tagConnector}
              />

              <rect
                x={x - 8}
                y={10}
                width={16}
                height={20}
                rx={2}
                className={`${styles.tagNode} ${isSelected ? styles.selected : ''} ${isHovered ? styles.hovered : ''}`}
              />

              <text
                x={x}
                y={5}
                className={styles.tagName}
                textAnchor="middle"
              >
                {name}
              </text>

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
