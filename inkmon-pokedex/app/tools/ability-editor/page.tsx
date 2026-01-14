'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ConfigEditor,
  ValidationPanel,
  TimelineVisualizer,
  ComponentList,
  TemplateSelector,
  type ValidationError,
  type TimelineData,
  type TagActionsData,
  type ComponentData,
} from '@/components/ability-editor';
import { getTemplateJSON } from '@/lib/ability-editor/templates/abilityTemplates';
import type { AbilityConfigJSON } from '@/lib/ability-editor/config/types';

import styles from './page.module.css';

const DEFAULT_TIMELINE: TimelineData = {
  id: 'timeline_basic_attack',
  totalDuration: 1000,
  tags: {
    start: 0,
    impact: 500,
    recover: 750,
    complete: 1000,
  },
};

export default function AbilityEditorPage() {
  const [configJson, setConfigJson] = useState(() => getTemplateJSON('basicAttack'));
  const [parsedConfig, setParsedConfig] = useState<AbilityConfigJSON | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [selectedTimelineTag, setSelectedTimelineTag] = useState<string | null>(null);

  const handleValidationSuccess = useCallback((json: AbilityConfigJSON) => {
    setParsedConfig(json);
    setErrors([]);
  }, []);

  const handleValidationError = useCallback((errs: ValidationError[]) => {
    setErrors(errs);
  }, []);

  const handleTemplateSelect = useCallback((json: string) => {
    setConfigJson(json);
  }, []);

  const timelineData = useMemo((): { timeline: TimelineData; tagActions: TagActionsData } | null => {
    if (!parsedConfig?.activeUseComponents?.[0]) return null;

    const activeUse = parsedConfig.activeUseComponents[0];
    return {
      timeline: {
        ...DEFAULT_TIMELINE,
        id: activeUse.timelineId,
      },
      tagActions: activeUse.tagActions as unknown as TagActionsData,
    };
  }, [parsedConfig]);

  const components = useMemo((): ComponentData[] => {
    return (parsedConfig?.components ?? []) as ComponentData[];
  }, [parsedConfig]);

  const handleComponentsChange = useCallback(
    (newComponents: ComponentData[]) => {
      if (!parsedConfig) return;

      const updated = {
        ...parsedConfig,
        components: newComponents,
      };

      setConfigJson(JSON.stringify(updated, null, 2));
      setParsedConfig(updated as unknown as AbilityConfigJSON);
    },
    [parsedConfig]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Ability Editor</h1>
        <p>技能配置编辑器 - Phase 2 Preview</p>
      </header>

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <section className={styles.section}>
            <h2>模板</h2>
            <TemplateSelector onSelect={handleTemplateSelect} />
          </section>

          <section className={styles.section}>
            <h2>配置编辑器</h2>
            <ConfigEditor
              value={configJson}
              onChange={setConfigJson}
              onValidationSuccess={handleValidationSuccess}
              onValidationError={handleValidationError}
              height="400px"
            />
          </section>

          <section className={styles.section}>
            <h2>验证状态</h2>
            <ValidationPanel errors={errors} />
          </section>
        </div>

        <div className={styles.rightPanel}>
          <section className={styles.section}>
            <h2>Timeline 预览</h2>
            {timelineData ? (
              <TimelineVisualizer
                timeline={timelineData.timeline}
                tagActions={timelineData.tagActions}
                selectedTag={selectedTimelineTag ?? undefined}
                onTagSelect={setSelectedTimelineTag}
                height={300}
              />
            ) : (
              <div className={styles.placeholder}>解析配置后显示 Timeline</div>
            )}
          </section>

          <section className={styles.section}>
            <h2>Components</h2>
            <ComponentList
              components={components}
              onChange={handleComponentsChange}
            />
          </section>

          {parsedConfig && (
            <section className={styles.section}>
              <h2>解析结果</h2>
              <pre className={styles.preview}>
                {JSON.stringify(parsedConfig, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
