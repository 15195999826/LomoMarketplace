'use client';

import { useState, useCallback } from 'react';
import { TimelineEditor } from './TimelineEditor';
import type { TimelineData } from './TimelineVisualizer';
import styles from './TimelineManager.module.css';

const MOCK_TIMELINES: TimelineData[] = [
  {
    id: 'timeline_basic_attack',
    totalDuration: 1000,
    tags: {
      start: 0,
      impact: 500,
      recover: 750,
      complete: 1000,
    },
  },
  {
    id: 'timeline_aoe_spell',
    totalDuration: 1500,
    tags: {
      start: 0,
      cast: 300,
      impact: 800,
      recover: 1200,
      complete: 1500,
    },
  },
  {
    id: 'timeline_heal',
    totalDuration: 800,
    tags: {
      start: 0,
      effect: 400,
      complete: 800,
    },
  },
];

export function TimelineManager() {
  const [timelines, setTimelines] = useState<TimelineData[]>(MOCK_TIMELINES);
  const [editingTimeline, setEditingTimeline] = useState<TimelineData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(() => {
    const newTimeline: TimelineData = {
      id: `timeline_${Date.now()}`,
      totalDuration: 1000,
      tags: {
        start: 0,
        complete: 1000,
      },
    };
    setEditingTimeline(newTimeline);
    setIsCreating(true);
  }, []);

  const handleEdit = useCallback((timeline: TimelineData) => {
    setEditingTimeline({ ...timeline, tags: { ...timeline.tags } });
    setIsCreating(false);
  }, []);

  const handleSave = useCallback((timeline: TimelineData) => {
    if (isCreating) {
      setTimelines(prev => [...prev, timeline]);
    } else {
      setTimelines(prev => prev.map(t => t.id === timeline.id ? timeline : t));
    }
    setEditingTimeline(null);
    setIsCreating(false);
  }, [isCreating]);

  const handleCancel = useCallback(() => {
    setEditingTimeline(null);
    setIsCreating(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTimelines(prev => prev.filter(t => t.id !== id));
  }, []);

  if (editingTimeline) {
    return (
      <TimelineEditor
        timeline={editingTimeline}
        onSave={handleSave}
        onCancel={handleCancel}
        isNew={isCreating}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarInfo}>
          <span className={styles.count}>{timelines.length} 个 Timeline</span>
        </div>
        <button className={styles.createButton} onClick={handleCreate}>
          + 创建 Timeline
        </button>
      </div>

      <div className={styles.grid}>
        {timelines.map(timeline => (
          <div key={timeline.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardId}>{timeline.id}</span>
              <span className={styles.cardDuration}>{timeline.totalDuration}ms</span>
            </div>
            <div className={styles.cardTags}>
              {Object.entries(timeline.tags).map(([name, time]) => (
                <span key={name} className={styles.tag}>
                  <span className={styles.tagName}>{name}</span>
                  <span className={styles.tagTime}>{time}ms</span>
                </span>
              ))}
            </div>
            <div className={styles.cardActions}>
              <button 
                className={styles.editButton}
                onClick={() => handleEdit(timeline)}
              >
                编辑
              </button>
              <button 
                className={styles.deleteButton}
                onClick={() => handleDelete(timeline.id)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {timelines.length === 0 && (
        <div className={styles.empty}>
          <p>还没有创建任何 Timeline</p>
          <button className={styles.createButton} onClick={handleCreate}>
            创建第一个 Timeline
          </button>
        </div>
      )}
    </div>
  );
}
