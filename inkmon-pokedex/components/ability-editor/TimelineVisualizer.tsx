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
  editable?: boolean;
  onTimelineChange?: (timeline: TimelineData) => void;
}

const TRACK_PADDING = 16;

export function TimelineVisualizer({
  timeline,
  tagActions,
  selectedTag,
  onTagSelect,
  height = 200,
  editable = false,
  onTimelineChange,
}: TimelineVisualizerProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const tagPositions = useMemo(() => {
    const positions: Array<{
      name: string;
      time: number;
      percent: number;
      actionCount: number;
    }> = [];

    const sortedTags = Object.entries(timeline.tags).sort(([, a], [, b]) => a - b);

    for (const [name, time] of sortedTags) {
      const percent = (time / timeline.totalDuration) * 100;
      const actionCount = tagActions[name]?.length ?? 0;
      positions.push({ name, time, percent, actionCount });
    }

    return positions;
  }, [timeline, tagActions]);

  const rulerMarkers = useMemo(() => {
    const markers: Array<{ time: number; percent: number; isMajor: boolean }> = [];
    const majorStep = timeline.totalDuration <= 1000 ? 250 : 500;
    const minorStep = majorStep / 4;

    for (let time = 0; time <= timeline.totalDuration; time += minorStep) {
      const percent = (time / timeline.totalDuration) * 100;
      const isMajor = time % majorStep === 0;
      markers.push({ time, percent, isMajor });
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
        <div className={styles.headerLeft}>
          <span className={styles.title}>Timeline</span>
          <span className={styles.timelineId}>{timeline.id}</span>
        </div>
        <span className={styles.duration}>{timeline.totalDuration}ms</span>
      </div>

      <div className={styles.timelineWrapper}>
        <div className={styles.rulerTrack}>
          {rulerMarkers.map(({ time, percent, isMajor }) => (
            <div
              key={time}
              className={styles.rulerMarker}
              style={{ left: `calc(${TRACK_PADDING}px + ${percent}% * (100% - ${TRACK_PADDING * 2}px) / 100%)` }}
            >
              <div className={`${styles.rulerTick} ${isMajor ? styles.rulerTickMajor : ''}`} />
              {isMajor && <span className={styles.rulerLabel}>{time}</span>}
            </div>
          ))}
        </div>

        <div className={styles.mainTrack}>
          <div className={styles.trackLineGlow} />
          <div className={styles.trackLine} />

          {tagPositions.map(({ name, time, percent, actionCount }) => {
            const isSelected = selectedTag === name;
            const isHovered = hoveredTag === name;

            return (
              <div
                key={name}
                className={styles.tagMarker}
                style={{ left: `calc(${TRACK_PADDING}px + ${percent}% * (100% - ${TRACK_PADDING * 2}px) / 100%)` }}
                onClick={() => handleTagClick(name)}
                onMouseEnter={() => setHoveredTag(name)}
                onMouseLeave={() => setHoveredTag(null)}
              >
                <span className={`${styles.tagLabel} ${isSelected ? styles.selected : ''}`}>
                  {name}
                </span>
                <div className={styles.tagConnector} />
                <div
                  className={`${styles.tagNode} ${isSelected ? styles.selected : ''} ${actionCount > 0 ? styles.hasActions : ''}`}
                >
                  {actionCount > 0 && (
                    <span className={styles.actionBadge}>{actionCount}</span>
                  )}
                </div>
                <span className={styles.tagTime}>{time}ms</span>
              </div>
            );
          })}
        </div>
      </div>

      {editable && (
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolbarBtn} title="Add Tag">+</button>
          <button type="button" className={styles.toolbarBtn} title="Remove Tag">−</button>
          <div className={styles.toolbarDivider} />
          <button type="button" className={styles.toolbarBtn} title="Snap to Grid">⊞</button>
          <div className={styles.zoomControls}>
            <span className={styles.zoomLabel}>Zoom</span>
            <button type="button" className={styles.toolbarBtn}>−</button>
            <button type="button" className={styles.toolbarBtn}>+</button>
          </div>
        </div>
      )}

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
        <span className={styles.actionDetailsTag}>{tagName}</span>
        <span className={styles.actionDetailsTime}>@ {time}ms</span>
      </div>
      <div className={styles.actionList}>
        {actions.length === 0 ? (
          <div className={styles.noActions}>No actions bound to this tag</div>
        ) : (
          actions.map((action, index) => (
            <div key={index} className={styles.actionItem}>
              <div className={styles.actionType}>{action.type}</div>
              <div className={styles.actionParams}>
                {Object.entries(action)
                  .filter(([key]) => key !== 'type')
                  .slice(0, 4)
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
