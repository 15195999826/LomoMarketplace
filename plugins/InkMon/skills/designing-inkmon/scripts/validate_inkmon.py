#!/usr/bin/env python3
"""
InkMon JSON 验证脚本

验证 InkMon JSON 文件是否符合 Schema 和业务规则。

用法:
    python validate_inkmon.py <json_file>
    python validate_inkmon.py data/inkmons/MossBear.json

返回:
    成功: 退出码 0，输出 "[OK] 验证通过"
    失败: 退出码 1，输出具体错误信息
"""

import json
import sys
import os
import re
from pathlib import Path

# Windows 编码兼容
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# BST 范围定义
BST_RANGES = {
    "baby": (250, 350),
    "mature": (350, 450),
    "adult": (450, 550),
}

# 有效属性列表
VALID_ELEMENTS = [
    "fire", "water", "grass", "electric", "ice",
    "rock", "ground", "flying", "bug", "poison",
    "dark", "light", "steel", "dragon"
]

# 5个必须的风格锚点词
STYLE_ANCHORS = [
    "low poly",
    "faceted",
    "sharp edges",
    "ink sketch texture",
    "non-reflective surface"
]

# 有效食性
VALID_DIETS = ["herbivore", "carnivore", "omnivore", "special"]


class ValidationError:
    def __init__(self, field: str, message: str, fix_step: int = None):
        self.field = field
        self.message = message
        self.fix_step = fix_step  # 对应 SKILL.md 中的步骤号

    def __str__(self):
        step_hint = f" -> Step {self.fix_step}" if self.fix_step else ""
        return f"[ERROR] [{self.field}] {self.message}{step_hint}"


def validate_inkmon(data: dict) -> list[ValidationError]:
    """验证 InkMon 数据，返回错误列表"""
    errors = []

    if "inkmon" not in data:
        errors.append(ValidationError("root", "缺少 'inkmon' 根字段"))
        return errors

    inkmon = data["inkmon"]

    # === 基础字段验证 ===
    required_fields = [
        "name", "name_en", "dex_number", "description",
        "elements", "stats", "design", "evolution", "ecology", "image_prompts"
    ]
    for field in required_fields:
        if field not in inkmon:
            errors.append(ValidationError(field, f"缺少必需字段 '{field}'"))

    if errors:
        return errors  # 缺少基础字段，无法继续验证

    # === 名称验证 ===
    name = inkmon.get("name", "")
    if not (2 <= len(name) <= 4):
        errors.append(ValidationError("name", f"中文名称长度应为 2-4 字符，当前: {len(name)}", 2))

    name_en = inkmon.get("name_en", "")
    if not re.match(r'^[A-Za-z]+$', name_en):
        errors.append(ValidationError("name_en", "英文名称只能包含字母", 2))
    if len(name_en) > 12:
        errors.append(ValidationError("name_en", f"英文名称最长 12 字符，当前: {len(name_en)}", 2))

    # === 阶段验证 ===
    evolution = inkmon.get("evolution", {})
    stage = evolution.get("stage", "")
    if stage not in BST_RANGES:
        errors.append(ValidationError(
            "evolution.stage",
            f"无效阶段 '{stage}'，必须是 baby/mature/adult",
            1
        ))
        return errors  # 阶段无效，无法验证 BST

    # === 数值验证 ===
    stats = inkmon.get("stats", {})
    stat_fields = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"]

    # 检查六维是否存在
    for stat in stat_fields:
        if stat not in stats:
            errors.append(ValidationError(f"stats.{stat}", f"缺少 {stat} 数值", 3))

    if not errors:  # 六维都存在，计算总和
        calculated_bst = sum(stats.get(s, 0) for s in stat_fields)
        declared_bst = stats.get("bst", 0)

        # 检查 BST 计算
        if calculated_bst != declared_bst:
            errors.append(ValidationError(
                "stats.bst",
                f"BST 计算错误: 六维之和={calculated_bst}，声明={declared_bst}",
                3
            ))

        # 检查 BST 范围
        min_bst, max_bst = BST_RANGES[stage]
        if not (min_bst <= declared_bst <= max_bst):
            errors.append(ValidationError(
                "stats.bst",
                f"BST {declared_bst} 超出 {stage} 阶段范围 ({min_bst}-{max_bst})",
                3
            ))

        # 检查单项数值范围
        for stat in stat_fields:
            val = stats.get(stat, 0)
            if not (1 <= val <= 255):
                errors.append(ValidationError(
                    f"stats.{stat}",
                    f"{stat} 数值 {val} 超出有效范围 (1-255)",
                    3
                ))

    # === 属性验证 ===
    elements = inkmon.get("elements", {})
    primary = elements.get("primary")
    if primary not in VALID_ELEMENTS:
        errors.append(ValidationError(
            "elements.primary",
            f"无效主属性 '{primary}'，有效值: {', '.join(VALID_ELEMENTS)}",
            3
        ))

    secondary = elements.get("secondary")
    if secondary is not None and secondary not in VALID_ELEMENTS:
        errors.append(ValidationError(
            "elements.secondary",
            f"无效副属性 '{secondary}'",
            3
        ))

    # === 设计验证 ===
    design = inkmon.get("design", {})
    if not design.get("base_animal"):
        errors.append(ValidationError("design.base_animal", "缺少基础动物", 2))

    features = design.get("features", [])
    if not features or len(features) < 1:
        errors.append(ValidationError("design.features", "至少需要 1 个设计特征", 2))

    colors = design.get("color_palette", [])
    for i, color in enumerate(colors):
        if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
            errors.append(ValidationError(
                f"design.color_palette[{i}]",
                f"无效 HEX 颜色格式: {color}",
                2
            ))

    # === 生态验证 ===
    ecology = inkmon.get("ecology", {})
    diet = ecology.get("diet")
    if diet not in VALID_DIETS:
        errors.append(ValidationError(
            "ecology.diet",
            f"无效食性 '{diet}'，有效值: {', '.join(VALID_DIETS)}",
            4
        ))

    # === 提示词验证 ===
    image_prompts = inkmon.get("image_prompts", {})
    design_prompt = image_prompts.get("design", "").lower()

    if not design_prompt:
        errors.append(ValidationError("image_prompts.design", "缺少 design 提示词", 5))
    else:
        # 检查风格锚点词
        missing_anchors = []
        for anchor in STYLE_ANCHORS:
            if anchor.lower() not in design_prompt:
                missing_anchors.append(anchor)

        if missing_anchors:
            errors.append(ValidationError(
                "image_prompts.design",
                f"提示词缺少风格锚点词: {', '.join(missing_anchors)}",
                5
            ))

    return errors


def main():
    if len(sys.argv) < 2:
        print("用法: python validate_inkmon.py <json_file>")
        print("示例: python validate_inkmon.py data/inkmons/MossBear.json")
        sys.exit(1)

    json_path = Path(sys.argv[1])

    if not json_path.exists():
        print(f"[ERROR] File not found: {json_path}")
        sys.exit(1)

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON parse error: {e}")
        sys.exit(1)

    errors = validate_inkmon(data)

    if errors:
        print(f"Found {len(errors)} error(s):\n")
        for error in errors:
            print(f"  {error}")
        print("\nPlease fix the errors and return to the corresponding step.")
        sys.exit(1)
    else:
        inkmon_name = data.get("inkmon", {}).get("name_en", "Unknown")
        print(f"[OK] Validation passed: {inkmon_name}")
        sys.exit(0)


if __name__ == "__main__":
    main()
