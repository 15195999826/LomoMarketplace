'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { TimelineData } from './TimelineVisualizer';
import styles from './TimelineEditor.module.css';

interface TimelineEditorProps {
  timeline: TimelineData;
  onSave: (timeline: TimelineData) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const RULER_HEIGHT = 32;
const TRACK_HEIGHT = 120;
const TAG_NODE_SIZE = 16;

export function TimelineEditor({ timeline: initialTimeline, onSave, onCancel, isNew }: TimelineEditorProps) {
  const [timeline, setTimeline] = useState<TimelineData>(initialTimeline);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);

  const sortedTags = useMemo(() => {
    return Object.entries(timeline.tags)
      .sort(([, a], [, b]) => a - b)
      .map(([name, time]) => ({ name, time }));
  }, [timeline.tags]);

  const timeToPercent = useCallback((time: number) => {
    return (time / timeline.totalDuration) * 100;
  }, [timeline.totalDuration]);

  const percentToTime = useCallback((percent: number) => {
    return Math.round((percent / 100) * timeline.totalDuration);
  }, [timeline.totalDuration]);

  const handleMouseDown = useCallback((tagName: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingTag(tagName);
    setSelectedTag(tagName);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingTag || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = percentToTime(percent);

    setTimeline(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [draggingTag]: newTime,
      },
    }));
  }, [draggingTag, percentToTime]);

  const handleMouseUp = useCallback(() => {
    setDraggingTag(null);
  }, []);

  useEffect(() => {
    if (draggingTag) {
      const handleGlobalMouseUp = () => setDraggingTag(null);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [draggingTag]);

  const handleAddTag = useCallback(() => {
    const existingNames = Object.keys(timeline.tags);
    let newName = 'tag';
    let counter = 1;
    while (existingNames.includes(newName)) {
      newName = `tag${counter}`;
      counter++;
    }

    const middleTime = Math.round(timeline.totalDuration / 2);
    setTimeline(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [newName]: middleTime,
      },
    }));
    setSelectedTag(newName);
  }, [timeline]);

  const handleDeleteTag = useCallback((tagName: string) => {
    if (tagName === 'start' || tagName === 'complete') return;
    
    setTimeline(prev => {
      const newTags = { ...prev.tags };
      delete newTags[tagName];
      return { ...prev, tags: newTags };
    });
    if (selectedTag === tagName) {
      setSelectedTag(null);
    }
  }, [selectedTag]);

  const handleTagRename = useCallback((oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;
    if (timeline.tags[newName] !== undefined) return;

    setTimeline(prev => {
      const newTags: Record<string, number> = {};
      for (const [key, value] of Object.entries(prev.tags)) {
        newTags[key === oldName ? newName : key] = value;
      }
      return { ...prev, tags: newTags };
    });
    setSelectedTag(newName);
  }, [timeline.tags]);

  const handleTimeChange = useCallback((tagName: string, newTime: number) => {
    const clampedTime = Math.max(0, Math.min(timeline.totalDuration, newTime));
    setTimeline(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [tagName]: clampedTime,
      },
    }));
  }, [timeline.totalDuration]);

  const handleDurationChange = useCallback((newDuration: number) => {
    if (newDuration < 100) return;
    setTimeline(prev => ({
      ...prev,
      totalDuration: newDuration,
    }));
  }, []);

  const handleIdChange = useCallback((newId: string) => {
    setTimeline(prev => ({ ...prev, id: newId }));
  }, []);

  const rulerMarkers = useMemo(() => {
    const markers: Array<{ time: number; percent: number; isMajor: boolean }> = [];
    const step = timeline.totalDuration <= 1000 ? 100 : 250;
    const majorStep = step * 2;

    for (let time = 0; time <= timeline.totalDuration; time += step) {
      markers.push({
        time,
        percent: timeToPercent(time),
        isMajor: time % majorStep === 0,
      });
    }
    return markers;
  }, [timeline.totalDuration, timeToPercent]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.label}>Timeline ID</span>
          <input
            type="text"
            className={styles.idInput}
            value={timeline.id}
            onChange={(e) => handleIdChange(e.target.value)}
          />
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.label}>总时长</span>
          <input
            type="number"
            className={styles.durationInput}
            value={timeline.totalDuration}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            step={100}
            min={100}
          />
          <span className={styles.unit}>ms</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.cancelButton} onClick={onCancel}>取消</button>
          <button className={styles.saveButton} onClick={() => onSave(timeline)}>
            {isNew ? '创建' : '保存'}
          </button>
        </div>
      </div>

      <div className={styles.editorArea}>
        <div className={styles.toolbar}>
          <button className={styles.toolBtn} onClick={handleAddTag}>+ 添加 Tag</button>
          <button 
            className={styles.toolBtn} 
            onClick={() => selectedTag && handleDeleteTag(selectedTag)}
            disabled={!selectedTag || selectedTag === 'start' || selectedTag === 'complete'}
          >
            删除选中
          </button>
          <div className={styles.zoomControls}>
            <span className={styles.zoomLabel}>缩放</span>
            <button className={styles.zoomBtn} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>−</button>
            <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
            <button className={styles.zoomBtn} onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
          </div>
        </div>

        <div className={styles.timelineWrapper}>
          <div 
            className={styles.timelineContent}
            style={{ width: `${100 * zoom}%` }}
          >
            <div className={styles.ruler}>
              {rulerMarkers.map(({ time, percent, isMajor }) => (
                <div
                  key={time}
                  className={styles.rulerMark}
                  style={{ left: `${percent}%` }}
                >
                  <div className={`${styles.rulerTick} ${isMajor ? styles.major : ''}`} />
                  {isMajor && <span className={styles.rulerTime}>{time}</span>}
                </div>
              ))}
            </div>

            <div 
              ref={trackRef}
              className={styles.track}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className={styles.trackLine} />

              {sortedTags.map(({ name, time }) => {
                const isSelected = selectedTag === name;
                const isDragging = draggingTag === name;
                const isFixed = name === 'start' || name === 'complete';

                return (
                  <div
                    key={name}
                    className={`${styles.tagMarker} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
                    style={{ left: `${timeToPercent(time)}%` }}
                    onMouseDown={(e) => !isFixed && handleMouseDown(name, e)}
                    onClick={() => setSelectedTag(name)}
                  >
                    <span className={styles.tagLabel}>{name}</span>
                    <div className={styles.tagConnector} />
                    <div className={`${styles.tagNode} ${isFixed ? styles.fixed : ''}`} />
                    <span className={styles.tagTime}>{time}ms</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedTag && (
        <div className={styles.inspector}>
          <h3>Tag 属性</h3>
          <div className={styles.inspectorField}>
            <label>名称</label>
            <input
              type="text"
              value={selectedTag}
              onChange={(e) => handleTagRename(selectedTag, e.target.value)}
              disabled={selectedTag === 'start' || selectedTag === 'complete'}
            />
          </div>
          <div className={styles.inspectorField}>
            <label>时间</label>
            <input
              type="number"
              value={timeline.tags[selectedTag]}
              onChange={(e) => handleTimeChange(selectedTag, Number(e.target.value))}
              disabled={selectedTag === 'start' || selectedTag === 'complete'}
              step={10}
              min={0}
              max={timeline.totalDuration}
            />
            <span className={styles.unit}>ms</span>
          </div>
          {selectedTag !== 'start' && selectedTag !== 'complete' && (
            <button 
              className={styles.deleteTagBtn}
              onClick={() => handleDeleteTag(selectedTag)}
            >
              删除此 Tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
