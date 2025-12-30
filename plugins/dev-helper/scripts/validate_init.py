#!/usr/bin/env python3
"""
dev-helper 初始化校验脚本
验证项目的 dev-helper 初始化结果是否符合规范
"""

import json
import os
import sys
import re
import io
from pathlib import Path

# 修复 Windows 控制台编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
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

    def is_success(self) -> bool:
        return self.failed == 0


def validate_directory_structure(root: Path, result: ValidationResult):
    """校验目录结构"""
    print("\n📁 目录结构校验")

    required_paths = [
        (".claude-plugin/plugin.json", "文件"),
        ("skills/exploring-project/SKILL.md", "文件"),
        ("skills/exploring-project/references", "目录"),
        ("commands/update-arch.md", "文件"),
        ("commands/session-summary.md", "文件"),
        ("commands/whats-next.md", "文件"),
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


def validate_skill_md(root: Path, result: ValidationResult):
    """校验 SKILL.md 规范"""
    print("\n📄 SKILL.md 规范校验")

    skill_path = root / "skills/exploring-project/SKILL.md"
    if not skill_path.is_file():
        result.fail("SKILL.md 不存在，跳过内容校验")
        return

    content = skill_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    # 检查 frontmatter
    if not content.startswith("---"):
        result.fail("缺少 YAML frontmatter", "文件应以 --- 开头")
        return

    # 提取 frontmatter
    try:
        end_idx = content.index("---", 3)
        frontmatter = content[3:end_idx].strip()
    except ValueError:
        result.fail("frontmatter 格式错误", "需要用 --- 包裹")
        return

    # 检查 name 字段
    name_match = re.search(r'^name:\s*(.+)$', frontmatter, re.MULTILINE)
    if name_match:
        name = name_match.group(1).strip()
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
    desc_match = re.search(r'^description:\s*(.+)$', frontmatter, re.MULTILINE)
    if desc_match:
        desc = desc_match.group(1).strip()
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


def validate_plugin_json(root: Path, result: ValidationResult):
    """校验 plugin.json"""
    print("\n⚙️ plugin.json 校验")

    plugin_path = root / ".claude-plugin/plugin.json"
    if not plugin_path.is_file():
        result.fail("plugin.json 不存在")
        return

    try:
        content = plugin_path.read_text(encoding="utf-8")
        data = json.loads(content)
        result.ok("JSON 格式有效")

        if "name" in data:
            result.ok(f"包含 name 字段: {data['name']}")
        else:
            result.fail("缺少 name 字段")

        if "version" in data:
            result.ok(f"包含 version 字段: {data['version']}")

        if "description" in data:
            result.ok("包含 description 字段")

    except json.JSONDecodeError as e:
        result.fail(f"JSON 解析失败: {e}")


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
    validate_skill_md(root, result)
    validate_claude_md(root, result)
    validate_plugin_json(root, result)

    # 输出总结
    total = result.passed + result.failed
    print(f"\n{'='*50}")
    print(f"📊 校验结果: {result.passed}/{total} 项通过")

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
