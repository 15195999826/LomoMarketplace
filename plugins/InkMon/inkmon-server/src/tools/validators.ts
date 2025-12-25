import { BST_RANGES, type InkMon, type EvolutionStage } from "../types/inkmon.js";

// 5个必须的风格锚点词
const STYLE_ANCHORS = [
  "low poly",
  "faceted",
  "sharp edges",
  "ink sketch texture",
  "non-reflective surface"
];

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 验证 InkMon 业务规则
 */
export function validateInkMon(inkmon: InkMon): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. BST 计算验证
  const stats = inkmon.stats;
  const calculatedBst = stats.hp + stats.attack + stats.defense +
    stats.sp_attack + stats.sp_defense + stats.speed;

  if (calculatedBst !== stats.bst) {
    errors.push({
      field: "stats.bst",
      message: `BST 计算错误: 六维之和=${calculatedBst}, 声明=${stats.bst}`
    });
  }

  // 2. BST 范围验证
  const stage = inkmon.evolution.stage as EvolutionStage;
  const range = BST_RANGES[stage];
  if (stats.bst < range.min || stats.bst > range.max) {
    errors.push({
      field: "stats.bst",
      message: `BST ${stats.bst} 超出 ${stage} 阶段范围 (${range.min}-${range.max})`
    });
  }

  // 3. 风格锚点词验证
  const designPrompt = inkmon.image_prompts.design.toLowerCase();
  const missingAnchors = STYLE_ANCHORS.filter(
    anchor => !designPrompt.includes(anchor.toLowerCase())
  );

  if (missingAnchors.length > 0) {
    errors.push({
      field: "image_prompts.design",
      message: `提示词缺少风格锚点词: ${missingAnchors.join(", ")}`
    });
  }

  return errors;
}
