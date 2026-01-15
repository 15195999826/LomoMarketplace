'use client';

import Link from 'next/link';
import styles from './page.module.css';

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  status: 'stable' | 'beta' | 'wip';
}

const TOOLS: ToolCard[] = [
  {
    id: 'ability-editor',
    name: '技能编辑器',
    description: '可视化编辑技能配置，实时预览技能效果',
    icon: '⚔️',
    href: '/tools/ability-editor',
    status: 'beta',
  },
  {
    id: 'pathfinding',
    name: '寻路调试',
    description: '六边形地图寻路算法可视化调试工具',
    icon: '🗺️',
    href: '/tools/pathfinding',
    status: 'stable',
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  stable: { label: '稳定', color: '#4caf50' },
  beta: { label: 'Beta', color: '#ff9800' },
  wip: { label: '开发中', color: '#f44336' },
};

export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>开发工具</h1>
        <p>InkMon 项目开发辅助工具集</p>
      </header>

      <div className={styles.grid}>
        {TOOLS.map((tool) => {
          const status = STATUS_LABELS[tool.status];
          return (
            <Link key={tool.id} href={tool.href} className={styles.card}>
              <div className={styles.cardIcon}>{tool.icon}</div>
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h2>{tool.name}</h2>
                  <span 
                    className={styles.statusBadge}
                    style={{ background: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                <p>{tool.description}</p>
              </div>
              <div className={styles.cardArrow}>→</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
