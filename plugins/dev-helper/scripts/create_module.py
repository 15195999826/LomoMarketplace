#!/usr/bin/env python3
"""
create_module.py - 创建标准化的模块追踪文档

使用方法:
    python create_module.py <target_dir> <module_name> [options]

示例:
    python create_module.py . auth-system --description "用户认证模块" --paths "src/auth/,src/middleware/"
    python create_module.py . api-layer -d "API 层" -p "src/api/" -p "src/routes/"
"""

import io
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# 修复 Windows 控制台编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def get_template_path() -> Path:
    """获取模板文件路径"""
    script_dir = Path(__file__).parent
    # 模板文件在插件根目录，不在 templates/ 中（避免被 init 复制）
    template_path = script_dir.parent / "module_template.md"
    return template_path


def kebab_to_title(name: str) -> str:
    """将 kebab-case 转换为 Title Case"""
    return ' '.join(word.capitalize() for word in name.split('-'))


def validate_module_name(name: str) -> bool:
    """验证模块名格式（kebab-case）"""
    return bool(re.match(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$', name))


def create_module(
    target_dir: Path,
    module_name: str,
    description: str = "",
    tracked_paths: Optional[List[str]] = None
) -> dict:
    """
    创建模块追踪文档

    参数:
        target_dir: 项目根目录
        module_name: 模块名（kebab-case）
        description: 模块描述
        tracked_paths: 追踪路径列表

    返回:
        {
            'success': bool,
            'file_path': str,
            'module_name': str,
            'error': str (if failed)
        }
    """
    result = {
        'success': False,
        'module_name': module_name
    }

    # 验证模块名
    if not validate_module_name(module_name):
        result['error'] = f"模块名格式错误: {module_name}（需要 kebab-case，如 auth-system）"
        return result

    # 检查目标目录
    references_dir = target_dir / ".claude" / "skills" / "exploring-project" / "references"
    if not references_dir.exists():
        result['error'] = f"目录不存在: {references_dir}（请先运行 /dev-helper:init）"
        return result

    # 检查文件是否已存在
    output_file = references_dir / f"module_{module_name}.md"
    if output_file.exists():
        result['error'] = f"文件已存在: {output_file}"
        return result

    # 读取模板
    template_path = get_template_path()
    if not template_path.exists():
        result['error'] = f"模板文件不存在: {template_path}"
        return result

    template_content = template_path.read_text(encoding='utf-8')

    # 准备替换变量
    module_title = kebab_to_title(module_name)
    date = datetime.now().strftime('%Y-%m-%d')

    # 格式化 tracked_paths
    if tracked_paths:
        paths_yaml = '\n'.join(f'  - "{p}"' for p in tracked_paths)
    else:
        paths_yaml = '  - "path/to/module/"'

    # 默认描述
    if not description:
        description = f"{module_title} module"

    # 替换模板变量
    content = template_content
    content = content.replace('${MODULE_TITLE}', module_title)
    content = content.replace('${DESCRIPTION}', description)
    content = content.replace('${TRACKED_PATHS}', paths_yaml)
    content = content.replace('${DATE}', date)

    # 写入文件
    output_file.write_text(content, encoding='utf-8')

    result['success'] = True
    result['file_path'] = str(output_file)
    return result


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Create a standardized module tracking document',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python create_module.py . auth-system -d "用户认证模块" -p "src/auth/"
  python create_module.py . api-layer --description "API 层" --paths "src/api/,src/routes/"
        """
    )
    parser.add_argument('target_dir', help='Target project directory')
    parser.add_argument('module_name', help='Module name (kebab-case, e.g., auth-system)')
    parser.add_argument('-d', '--description', default='', help='Module description')
    parser.add_argument('-p', '--paths', action='append', default=[],
                       help='Tracked paths (can specify multiple times or comma-separated)')
    parser.add_argument('--json', action='store_true', help='Output result as JSON')

    args = parser.parse_args()

    target_dir = Path(args.target_dir).resolve()

    # 处理路径参数（支持逗号分隔和多次指定）
    tracked_paths = []
    for p in args.paths:
        tracked_paths.extend([x.strip() for x in p.split(',') if x.strip()])

    result = create_module(
        target_dir=target_dir,
        module_name=args.module_name,
        description=args.description,
        tracked_paths=tracked_paths if tracked_paths else None
    )

    if args.json:
        import json
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result['success']:
            print(f"✅ 模块文档创建成功")
            print(f"\n📄 文件: {result['file_path']}")
            print(f"📦 模块: {result['module_name']}")
            print(f"\n📌 下一步:")
            print(f"   1. 探索模块代码，填充各 SECTION 内容")
            print(f"   2. 运行 sync_skill.py 同步 SKILL.md")
        else:
            print(f"❌ 创建失败: {result.get('error', 'Unknown error')}")
            sys.exit(1)


if __name__ == '__main__':
    main()
