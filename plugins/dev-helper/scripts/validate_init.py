#!/usr/bin/env python3
"""
dev-helper 初始化校验脚本
验证项目的 dev-helper 初始化结果是否符合规范
"""

import os
import sys
import re
import io
from pathlib import Path
from typing import List, Dict, Any, Optional

# 修复 Windows 控制台编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.errors = []

    def ok(self, msg: str):
        self.passed += 1
        print(f"  ✅ {msg}")

    def fail(self, msg: str, suggestion: str = ""):
        self.failed += 1
        self.errors.append((msg, suggestion))
        print(f"  ❌ {msg}")
        if suggestion:
            print(f"     💡 {suggestion}")

    def warn(self, msg: str, suggestion: str = ""):
        self.warnings += 1
        print(f"  ⚠️ {msg}")
        if suggestion:
            print(f"     💡 {suggestion}")

    def is_success(self) -> bool:
        return self.failed == 0


def parse_yaml_frontmatter(content: str) -> Optional[Dict[str, Any]]:
    """简单解析 YAML frontmatter（不依赖 pyyaml）"""
    if not content.startswith("---"):
        return None

    try:
        end_idx = content.index("---", 3)
        frontmatter_text = content[3:end_idx].strip()
    except ValueError:
        return None

    result = {}
    current_key = None
    current_list = None

    for line in frontmatter_text.split("\n"):
        # 跳过空行
        if not line.strip():
            continue

        # 检查是否是列表项
        list_match = re.match(r'^(\s+)-\s*(.*)$', line)
        if list_match and current_list is not None:
            indent, value = list_match.groups()
            # 简单的列表项
            if value.strip():
                # 检查是否是对象形式的列表项
                if value.strip().startswith("name:"):
                    # 开始一个新的对象
                    obj = {}
                    obj_match = re.match(r'name:\s*(.+)', value.strip())
                    if obj_match:
                        obj['name'] = obj_match.group(1).strip()
                    current_list.append(obj)
                else:
                    current_list.append(value.strip().strip('"\''))
            continue

        # 检查是否是对象列表项的后续属性
        prop_match = re.match(r'^(\s+)(\w+):\s*(.*)$', line)
        if prop_match and current_list and len(current_list) > 0 and isinstance(current_list[-1], dict):
            indent, key, value = prop_match.groups()
            # 处理数组值
            if value.strip().startswith("[") and value.strip().endswith("]"):
                # 简单数组解析
                arr_content = value.strip()[1:-1]
                arr_items = [s.strip().strip('"\'') for s in arr_content.split(",") if s.strip()]
                current_list[-1][key] = arr_items
            else:
                current_list[-1][key] = value.strip().strip('"\'')
            continue

        # 普通键值对
        kv_match = re.match(r'^(\w+):\s*(.*)$', line)
        if kv_match:
            key, value = kv_match.groups()
            value = value.strip()

            if value == "[]":
                result[key] = []
                current_list = result[key]
                current_key = key
            elif value == "":
                # 可能是开始一个列表
                result[key] = []
                current_list = result[key]
                current_key = key
            elif value.startswith("[") and value.endswith("]"):
                # 内联数组
                arr_content = value[1:-1]
                arr_items = [s.strip().strip('"\'') for s in arr_content.split(",") if s.strip()]
                result[key] = arr_items
                current_list = None
                current_key = key
            else:
                result[key] = value.strip('"\'')
                current_list = None
                current_key = key

    return result


def validate_directory_structure(root: Path, result: ValidationResult):
    """校验目录结构"""
    print("\n📁 目录结构校验")

    required_paths = [
        (".claude/commands", "目录"),
        (".claude/skills/exploring-project", "目录"),
        (".claude/skills/exploring-project/references", "目录"),
        (".claude/skills/exploring-project/SKILL.md", "文件"),
        (".claude/commands/update-arch.md", "文件"),
        (".claude/commands/session-summary.md", "文件"),
        (".claude/commands/whats-next.md", "文件"),
        (".claude/commands/track-module.md", "文件"),
        ("project-notes", "目录"),
        ("CLAUDE.md", "文件"),
    ]

    for path, path_type in required_paths:
        full_path = root / path
        if path_type == "文件":
            if full_path.is_file():
                result.ok(path)
            else:
                result.fail(f"{path} 不存在", f"运行 /dev-helper:init 创建")
        else:
            if full_path.is_dir():
                result.ok(path)
            else:
                result.fail(f"{path}/ 目录不存在", f"运行 mkdir -p {path}")


def validate_skill_md(root: Path, result: ValidationResult) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    """校验 SKILL.md 规范，返回 (frontmatter, content)"""
    print("\n📄 SKILL.md 规范校验")

    skill_path = root / ".claude/skills/exploring-project/SKILL.md"
    if not skill_path.is_file():
        result.fail("SKILL.md 不存在，跳过内容校验")
        return None, None

    content = skill_path.read_text(encoding="utf-8")

    # 检查 frontmatter
    if not content.startswith("---"):
        result.fail("缺少 YAML frontmatter", "文件应以 --- 开头")
        return None, content

    # 提取 frontmatter
    try:
        end_idx = content.index("---", 3)
        frontmatter_text = content[3:end_idx].strip()
    except ValueError:
        result.fail("frontmatter 格式错误", "需要用 --- 包裹")
        return None, content

    # 解析 frontmatter
    frontmatter = parse_yaml_frontmatter(content)
    if frontmatter is None:
        result.fail("无法解析 frontmatter")
        return None, content

    # 检查 name 字段
    name = frontmatter.get("name", "")
    if name:
        if name == "exploring-project":
            result.ok("name: exploring-project")
        else:
            result.fail(f"name 应为 'exploring-project'，当前为 '{name}'")

        if len(name) <= 64:
            result.ok(f"name 长度 ({len(name)}/64)")
        else:
            result.fail(f"name 超过 64 字符 ({len(name)})")

        if re.match(r'^[a-z0-9-]+$', name):
            result.ok("name 格式正确 (kebab-case)")
        else:
            result.fail("name 必须是 kebab-case (小写字母、数字、连字符)")
    else:
        result.fail("缺少 name 字段")

    # 检查 description 字段
    desc = frontmatter.get("description", "")
    if desc:
        if len(desc) <= 1024:
            result.ok(f"description 长度 ({len(desc)}/1024)")
        else:
            result.fail(f"description 超过 1024 字符 ({len(desc)})")

        # 检查第三人称（简单检查：不以 "我" 或 "你" 开头）
        if not desc.startswith(("我", "你", "I ", "You ")):
            result.ok("description 使用第三人称")
        else:
            result.fail("description 应使用第三人称", "避免使用 '我'、'你' 开头")
    else:
        result.fail("缺少 description 字段")

    # 检查 body 行数
    body_start = end_idx + 3
    body_lines = content[body_start:].strip().split("\n")
    if len(body_lines) <= 500:
        result.ok(f"body 行数 ({len(body_lines)}/500)")
    else:
        result.fail(f"body 超过 500 行 ({len(body_lines)})", "将详细内容移到 references/")

    # 检查 References 部分
    if "references/" in content.lower():
        result.ok("包含 references 引用")
    else:
        result.fail("缺少 references 引用", "添加指向 references/ 目录的链接")

    return frontmatter, content


def validate_region_markers(root: Path, content: str, result: ValidationResult):
    """校验 region 标记格式"""
    print("\n🔗 Region 标记校验")

    if content is None:
        result.fail("无法读取 SKILL.md 内容，跳过 region 校验")
        return

    # 检查 Generated Config region
    config_start = "<!-- region Generated Config Start -->"
    config_end = "<!-- region Generated Config End -->"

    if config_start in content and config_end in content:
        result.ok("Generated Config region 存在")

        # 提取并检查内容
        start_idx = content.index(config_start) + len(config_start)
        end_idx = content.index(config_end)
        config_content = content[start_idx:end_idx].strip()

        if "```yaml" in config_content:
            result.ok("Config region 包含 YAML 代码块")

            # 检查必要字段
            if "last_tracked_commit" in config_content:
                result.ok("包含 last_tracked_commit 字段")
            else:
                result.warn("缺少 last_tracked_commit 字段", "运行 sync_skill.py 生成")

            if "last_updated" in config_content:
                result.ok("包含 last_updated 字段")
            else:
                result.warn("缺少 last_updated 字段", "运行 sync_skill.py 生成")
        else:
            result.fail("Config region 缺少 YAML 代码块")
    else:
        result.fail("缺少 Generated Config region",
                   "添加 <!-- region Generated Config Start --> ... <!-- region Generated Config End -->")

    # 检查 Generated References region
    refs_start = "<!-- region Generated References Start -->"
    refs_end = "<!-- region Generated References End -->"

    if refs_start in content and refs_end in content:
        result.ok("Generated References region 存在")

        # 检查是否包含 references 链接
        start_idx = content.index(refs_start) + len(refs_start)
        end_idx = content.index(refs_end)
        refs_content = content[start_idx:end_idx].strip()

        if "references/" in refs_content:
            result.ok("References region 包含文件链接")
        else:
            result.warn("References region 为空", "运行 sync_skill.py 生成")
    else:
        result.fail("缺少 Generated References region",
                   "添加 <!-- region Generated References Start --> ... <!-- region Generated References End -->")

    # 检查 module_*.md 文件
    references_dir = root / ".claude/skills/exploring-project/references"
    if references_dir.exists():
        module_files = list(references_dir.glob("module_*.md"))
        if module_files:
            result.ok(f"发现 {len(module_files)} 个模块文件")
            for mf in module_files:
                result.ok(f"  - {mf.name}")
        else:
            result.warn("尚未追踪任何模块", "运行 /track-module <name> 添加模块")


def validate_claude_md(root: Path, result: ValidationResult):
    """校验 CLAUDE.md"""
    print("\n📝 CLAUDE.md 校验")

    claude_path = root / "CLAUDE.md"
    if not claude_path.is_file():
        result.fail("CLAUDE.md 不存在")
        return

    content = claude_path.read_text(encoding="utf-8")

    # 检查 Dev Helper 章节
    if "## Dev Helper" in content or "## dev-helper" in content.lower():
        result.ok("包含 Dev Helper 章节")
    else:
        result.fail("缺少 ## Dev Helper 章节")

    # 检查 skill 激活指令
    if "skill:exploring-project" in content:
        result.ok("包含 skill:exploring-project 激活指令")
    else:
        result.fail("缺少 skill:exploring-project", "添加 `skill:exploring-project` 激活指令")

    # 检查命令列表
    commands = ["/update-arch", "/session-summary", "/whats-next"]
    for cmd in commands:
        if cmd in content:
            result.ok(f"列出了 {cmd} 命令")
        else:
            result.fail(f"未列出 {cmd} 命令")

    # 检查 /track-module 命令（新增）
    if "/track-module" in content:
        result.ok("列出了 /track-module 命令")
    else:
        result.warn("未列出 /track-module 命令", "建议添加到命令列表")


def validate_command_md(root: Path, result: ValidationResult):
    """校验命令文件"""
    print("\n⚙️ 命令文件校验")

    commands = [
        "update-arch.md",
        "session-summary.md",
        "whats-next.md",
        "track-module.md",
    ]

    for cmd in commands:
        cmd_path = root / ".claude/commands" / cmd
        if not cmd_path.is_file():
            result.fail(f"{cmd} 不存在")
            continue

        content = cmd_path.read_text(encoding="utf-8")

        # 检查 frontmatter
        if content.startswith("---"):
            try:
                end_idx = content.index("---", 3)
                frontmatter = content[3:end_idx].strip()

                # 检查 description
                if re.search(r'^description:\s*\S+', frontmatter, re.MULTILINE):
                    result.ok(f"{cmd} description 存在")
                else:
                    result.fail(f"{cmd} 缺少 description")

            except ValueError:
                result.fail(f"{cmd} frontmatter 格式错误")
        else:
            result.fail(f"{cmd} 缺少 frontmatter")


def main():
    # 获取项目根目录（从参数或当前目录）
    if len(sys.argv) > 1:
        root = Path(sys.argv[1])
    else:
        root = Path.cwd()

    print(f"🔍 dev-helper 初始化校验")
    print(f"   项目路径: {root.absolute()}")

    result = ValidationResult()

    # 执行各项校验
    validate_directory_structure(root, result)
    frontmatter, skill_content = validate_skill_md(root, result)
    validate_region_markers(root, skill_content, result)
    validate_claude_md(root, result)
    validate_command_md(root, result)

    # 输出总结
    total = result.passed + result.failed
    print(f"\n{'='*50}")
    print(f"📊 校验结果: {result.passed}/{total} 项通过")

    if result.warnings > 0:
        print(f"⚠️ {result.warnings} 项警告")

    if result.is_success():
        print("✅ 所有校验通过！")
        sys.exit(0)
    else:
        print(f"❌ {result.failed} 项失败")
        print("\n需要修复的问题:")
        for i, (msg, suggestion) in enumerate(result.errors, 1):
            print(f"  {i}. {msg}")
            if suggestion:
                print(f"     💡 {suggestion}")
        sys.exit(1)


if __name__ == "__main__":
    main()
