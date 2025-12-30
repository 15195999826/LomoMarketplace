#!/usr/bin/env python3
"""
dev-helper 项目初始化脚本
复制 templates/ 目录到目标项目，检查 Git 状态
"""

import json
import os
import shutil
import subprocess
import sys
import io
from pathlib import Path
from typing import List, Dict, Any

# 修复 Windows 控制台编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def check_git_initialized(target_dir: Path) -> bool:
    """检查目标目录是否已初始化 Git"""
    git_dir = target_dir / ".git"
    if git_dir.is_dir():
        return True

    # 也检查是否在 Git 仓库的子目录中
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=target_dir,
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def get_templates_dir() -> Path:
    """获取 templates 目录路径"""
    # 脚本位于 plugins/dev-helper/scripts/
    # templates 位于 plugins/dev-helper/templates/
    script_dir = Path(__file__).parent
    templates_dir = script_dir.parent / "templates"
    return templates_dir


def copy_templates(templates_dir: Path, target_dir: Path, force: bool = False) -> Dict[str, List[str]]:
    """
    复制 templates 目录到目标项目

    返回:
        {
            "created": ["file1", "file2"],  # 新创建的文件
            "updated": ["file3"],           # 覆盖更新的文件
            "skipped": ["file4"]            # 跳过的文件（已存在且未强制覆盖）
        }
    """
    result = {
        "created": [],
        "updated": [],
        "skipped": []
    }

    if not templates_dir.exists():
        raise FileNotFoundError(f"Templates directory not found: {templates_dir}")

    for src_file in templates_dir.rglob("*"):
        if src_file.is_dir():
            continue

        # 计算相对路径
        rel_path = src_file.relative_to(templates_dir)
        dst_file = target_dir / rel_path

        # 确保目标目录存在
        dst_file.parent.mkdir(parents=True, exist_ok=True)

        rel_path_str = str(rel_path).replace("\\", "/")

        if dst_file.exists():
            if force:
                # 强制覆盖
                shutil.copy2(src_file, dst_file)
                result["updated"].append(rel_path_str)
            else:
                # 默认也覆盖（根据用户需求：存在则替换重复文件）
                shutil.copy2(src_file, dst_file)
                result["updated"].append(rel_path_str)
        else:
            # 新建文件
            shutil.copy2(src_file, dst_file)
            result["created"].append(rel_path_str)

    return result


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Initialize dev-helper in a project")
    parser.add_argument("target_dir", nargs="?", default=".", help="Target project directory")
    parser.add_argument("--force", "-f", action="store_true", help="Force overwrite existing files")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")

    args = parser.parse_args()

    target_dir = Path(args.target_dir).resolve()

    # 1. 检查 Git 初始化
    git_initialized = check_git_initialized(target_dir)

    if not git_initialized:
        result = {
            "success": False,
            "error": "Git not initialized",
            "message": "请先在项目中初始化 Git: git init"
        }
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"❌ 错误: {result['message']}")
        sys.exit(1)

    # 2. 获取 templates 目录
    templates_dir = get_templates_dir()

    if not templates_dir.exists():
        result = {
            "success": False,
            "error": "Templates not found",
            "message": f"模板目录不存在: {templates_dir}"
        }
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"❌ 错误: {result['message']}")
        sys.exit(1)

    # 3. 复制 templates
    try:
        copy_result = copy_templates(templates_dir, target_dir, args.force)
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "message": f"复制模板失败: {e}"
        }
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"❌ 错误: {result['message']}")
        sys.exit(1)

    # 4. 输出结果
    result = {
        "success": True,
        "git_initialized": True,
        "target_dir": str(target_dir),
        "created": copy_result["created"],
        "updated": copy_result["updated"],
        "skipped": copy_result["skipped"]
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("✅ dev-helper 模板初始化完成")
        print(f"\n目标目录: {target_dir}")

        if copy_result["created"]:
            print(f"\n📁 新建文件 ({len(copy_result['created'])} 个):")
            for f in copy_result["created"]:
                print(f"  + {f}")

        if copy_result["updated"]:
            print(f"\n🔄 更新文件 ({len(copy_result['updated'])} 个):")
            for f in copy_result["updated"]:
                print(f"  ~ {f}")

        if copy_result["skipped"]:
            print(f"\n⏭️ 跳过文件 ({len(copy_result['skipped'])} 个):")
            for f in copy_result["skipped"]:
                print(f"  - {f}")

        total = len(copy_result["created"]) + len(copy_result["updated"])
        print(f"\n总计: {total} 个文件已处理")


if __name__ == "__main__":
    main()
