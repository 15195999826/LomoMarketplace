'use client';

import { abilityTemplates, templateMeta, getTemplateJSON, type TemplateKey } from '@/lib/ability-editor/templates/abilityTemplates';
import styles from './TemplateSelector.module.css';

export interface TemplateSelectorProps {
  onSelect: (json: string) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const templateKeys = Object.keys(abilityTemplates) as TemplateKey[];

  return (
    <div className={styles.container}>
      <div className={styles.header}>选择模板</div>
      <div className={styles.grid}>
        {templateKeys.map((key) => {
          const meta = templateMeta[key];
          return (
            <button
              key={key}
              className={styles.templateCard}
              onClick={() => onSelect(getTemplateJSON(key))}
            >
              <span className={styles.icon}>{meta.icon}</span>
              <span className={styles.name}>{meta.name}</span>
              <span className={styles.description}>{meta.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
