"use client";

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "攻击",
  defense: "防御",
  sp_attack: "特攻",
  sp_defense: "特防",
  speed: "速度",
};

export function StatBar({
  label,
  value,
  maxValue = 255,
  color,
}: StatBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const displayLabel = STAT_LABELS[label] || label;

  // 根据数值选择颜色
  const getBarColor = () => {
    if (color) return color;
    if (value >= 150) return "#7CB342"; // 高
    if (value >= 100) return "#FFD93D"; // 中高
    if (value >= 70) return "#4ECDC4";  // 中
    if (value >= 50) return "#FF9800";  // 中低
    return "#FF6B35"; // 低
  };

  return (
    <div className="stat-bar">
      <span className="stat-bar-label">{displayLabel}</span>
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{
            width: `${percentage}%`,
            background: getBarColor(),
          }}
        />
      </div>
      <span className="stat-bar-value">{value}</span>
    </div>
  );
}
