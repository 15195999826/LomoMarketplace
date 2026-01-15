'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSkillTester } from '@/lib/ability-editor/hooks/useSkillTester';
import { parseAbilityConfig } from '@/lib/ability-editor/config/parser';
import type { AbilityConfigJSON } from '@/lib/ability-editor/config/types';
import { BattleStage } from '@/components/battle-replay/BattleStage';
import type { ActorState } from '@/components/battle-replay/types';

import styles from './SkillTestPanel.module.css';

export interface SkillTestPanelProps {
  parsedConfig: AbilityConfigJSON | null;
}

export function SkillTestPanel({ parsedConfig }: SkillTestPanelProps) {
  const { testResult, isRunning, runTest, rerun, director } = useSkillTester();
  const [showDebug, setShowDebug] = useState(true);

  const handleRunTest = useCallback(() => {
    if (!parsedConfig) return;
    try {
      const abilityConfig = parseAbilityConfig(parsedConfig);
      runTest({ abilityConfig });
    } catch (e) {
      console.error('Failed to parse ability config:', e);
    }
  }, [parsedConfig, runTest]);

  const actorsMap = useMemo((): Map<string, ActorState> => {
    if (!director?.state.renderState.actors) return new Map();
    const map = new Map<string, ActorState>();
    for (const actor of director.state.renderState.actors) {
      map.set(actor.id, {
        id: actor.id,
        displayName: actor.displayName,
        team: actor.team,
        hp: actor.visualHP,
        maxHp: actor.maxHP,
        position: actor.position,
        isAlive: actor.isAlive,
        elements: actor.elements,
      });
    }
    return map;
  }, [director?.state.renderState.actors]);

  const hasResult = testResult !== null;
  const isSuccess = testResult?.success ?? false;

  const debugInfo = useMemo(() => {
    if (!testResult?.success || !testResult.replay) return null;
    const { replay, ticksUsed } = testResult;
    const { meta, timeline, initialActors } = replay;
    
    const totalEvents = timeline.reduce((sum, frame) => sum + frame.events.length, 0);
    const eventTypes = new Set<string>();
    timeline.forEach(frame => {
      frame.events.forEach(event => {
        eventTypes.add(event.kind);
      });
    });

    return {
      ticksUsed,
      totalFrames: meta.totalFrames,
      tickInterval: meta.tickInterval,
      totalDuration: meta.totalFrames * meta.tickInterval,
      totalEvents,
      eventTypes: Array.from(eventTypes),
      actorCount: initialActors.length,
      timeline: timeline.map(frame => ({
        frame: frame.frame,
        time: frame.frame * meta.tickInterval,
        events: frame.events.map(e => e),
      })),
    };
  }, [testResult]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>技能测试</h2>
        <div className={styles.actions}>
          <button
            className={styles.runButton}
            onClick={handleRunTest}
            disabled={!parsedConfig || isRunning}
          >
            {isRunning ? '运行中...' : '▶ 运行测试'}
          </button>
          {hasResult && (
            <button
              className={styles.rerunButton}
              onClick={rerun}
              disabled={isRunning}
            >
              ↻ 重新运行
            </button>
          )}
          {hasResult && (
            <button
              className={styles.debugToggle}
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? '隐藏调试' : '显示调试'}
            </button>
          )}
        </div>
      </div>

      {testResult && !isSuccess && (
        <div className={styles.error}>
          ❌ 测试失败: {testResult.error}
        </div>
      )}

      {showDebug && debugInfo && (
        <div className={styles.debugPanel}>
          <div className={styles.debugSummary}>
            <span>逻辑帧: {debugInfo.ticksUsed}</span>
            <span>总时长: {debugInfo.totalDuration}ms</span>
            <span>事件数: {debugInfo.totalEvents}</span>
            <span>角色数: {debugInfo.actorCount}</span>
          </div>
          <div className={styles.debugEvents}>
            <div className={styles.debugLabel}>事件类型: {debugInfo.eventTypes.join(', ') || '无'}</div>
            <div className={styles.debugTimeline}>
              {debugInfo.timeline.map((frame) => (
                <div key={frame.frame} className={styles.debugFrame}>
                  <span className={styles.debugFrameNum}>F{frame.frame} ({frame.time}ms)</span>
                  {frame.events.map((event, i) => (
                    <div key={i} className={styles.debugEvent}>
                      <span className={styles.eventKind}>{event.kind}</span>
                      <span className={styles.eventData}>
                        {JSON.stringify(Object.fromEntries(
                          Object.entries(event).filter(([k]) => k !== 'kind')
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {debugInfo.timeline.length === 0 && (
                <div className={styles.debugEmpty}>无事件记录</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.stage}>
        {director ? (
          <BattleStage
            actors={actorsMap}
            events={[]}
            floatingTexts={director.state.renderState.floatingTexts}
            meleeStrikes={director.state.renderState.meleeStrikes}
            interpolatedPositions={director.state.renderState.interpolatedPositions}
          />
        ) : (
          <div className={styles.placeholder}>
            {isRunning ? '正在运行测试...' : '点击"运行测试"查看效果'}
          </div>
        )}
      </div>

      {director && (
        <div className={styles.controls}>
          <div className={styles.playbackButtons}>
            <button onClick={director.controls.reset} title="重置">
              ⏮
            </button>
            <button onClick={director.controls.toggle}>
              {director.state.isPlaying ? '⏸' : '▶'}
            </button>
          </div>
          <div className={styles.speedSelector}>
            <span>速度:</span>
            {[0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                className={director.state.speed === speed ? styles.activeSpeed : ''}
                onClick={() => director.controls.setSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className={styles.frameInfo}>
            帧: {director.state.currentFrame} / {director.state.totalFrames}
          </div>
        </div>
      )}
    </div>
  );
}
