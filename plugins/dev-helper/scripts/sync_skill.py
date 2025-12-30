#!/usr/bin/env python3
"""
sync_skill.py - 同步 SKILL.md 的 References 和 Config 区域

功能：
1. 扫描 references/ 目录，识别 module_*.md 文件
2. 读取每个模块文件的 Generated Config 区域获取元数据
3. 更新 SKILL.md 的 Generated References 区域
4. 更新 SKILL.md 的 Generated Config 区域
5. 更新 Core Modules 表格
"""

import io
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 修复 Windows 控制台编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# Region 标记正则
REGION_PATTERN = re.compile(
    r'<!-- region Generated (\w+) Start -->\s*'
    r'(.*?)'
    r'<!-- region Generated \1 End -->',
    re.DOTALL
)

# YAML 代码块正则
YAML_BLOCK_PATTERN = re.compile(r'```yaml\s*(.*?)\s*```', re.DOTALL)


def parse_yaml_simple(yaml_text: str) -> Dict[str, any]:
    """简单解析 YAML 文本（不依赖 pyyaml）"""
    result = {}
    current_key = None
    current_list = []
    in_list = False

    for line in yaml_text.strip().split('\n'):
        line = line.rstrip()
        if not line:
            continue

        # 检查是否是列表项
        list_match = re.match(r'^(\s*)-\s*(.*)$', line)
        if list_match:
            indent, value = list_match.groups()
            if in_list and current_key:
                current_list.append(value.strip().strip('"\''))
            continue

        # 普通键值对
        kv_match = re.match(r'^(\w+):\s*(.*)$', line)
        if kv_match:
            # 保存之前的列表
            if in_list and current_key:
                result[current_key] = current_list
                current_list = []
                in_list = False

            key, value = kv_match.groups()
            value = value.strip()

            if value == '' or value == '[]':
                # 开始一个列表
                in_list = True
                current_key = key
                current_list = []
            elif value.startswith('[') and value.endswith(']'):
                # 内联数组
                items = value[1:-1].split(',')
                result[key] = [item.strip().strip('"\'') for item in items if item.strip()]
            else:
                result[key] = value.strip('"\'')
                current_key = key

    # 保存最后的列表
    if in_list and current_key:
        result[current_key] = current_list

    return result


def read_region(content: str, region_name: str) -> Optional[str]:
    """读取指定 region 的内容"""
    pattern = re.compile(
        rf'<!-- region Generated {region_name} Start -->\s*'
        rf'(.*?)'
        rf'<!-- region Generated {region_name} End -->',
        re.DOTALL
    )
    match = pattern.search(content)
    if match:
        return match.group(1).strip()
    return None


def write_region(content: str, region_name: str, new_content: str) -> str:
    """更新指定 region 的内容"""
    pattern = re.compile(
        rf'(<!-- region Generated {region_name} Start -->)\s*'
        rf'.*?'
        rf'(<!-- region Generated {region_name} End -->)',
        re.DOTALL
    )
    replacement = f'\\1\n{new_content}\n\\2'
    return pattern.sub(replacement, content)


def parse_module_config(file_path: Path) -> Optional[Dict]:
    """解析模块文件的 Generated Config 区域"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return None

    region_content = read_region(content, 'Config')
    if not region_content:
        return None

    yaml_match = YAML_BLOCK_PATTERN.search(region_content)
    if not yaml_match:
        return None

    yaml_text = yaml_match.group(1)
    config = parse_yaml_simple(yaml_text)

    # 从文件名提取模块名
    # module_auth-system.md -> auth-system
    filename = file_path.stem
    if filename.startswith('module_'):
        config['name'] = filename[7:]  # 去掉 'module_' 前缀
    else:
        config['name'] = filename

    config['file'] = file_path.name
    return config


def scan_references(references_dir: Path) -> Tuple[List[Dict], List[Dict]]:
    """
    扫描 references 目录

    返回:
        (modules, other_files)
        - modules: 模块文件列表 [{name, file, description, tracked_paths, ...}]
        - other_files: 其他文件列表 [{file, title}]
    """
    modules = []
    other_files = []

    if not references_dir.exists():
        return modules, other_files

    for file_path in sorted(references_dir.glob('*.md')):
        filename = file_path.name

        if filename.startswith('module_'):
            # 模块文件
            config = parse_module_config(file_path)
            if config:
                modules.append(config)
            else:
                # 无法解析配置，使用默认值
                name = file_path.stem[7:]  # 去掉 'module_' 前缀
                modules.append({
                    'name': name,
                    'file': filename,
                    'description': f'{name} module'
                })
        else:
            # 其他文件（overview.md, directory.md 等）
            # 尝试从文件内容读取标题
            try:
                content = file_path.read_text(encoding='utf-8')
                title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                title = title_match.group(1) if title_match else filename
            except Exception:
                title = filename

            other_files.append({
                'file': filename,
                'title': title
            })

    return modules, other_files


def generate_references_content(modules: List[Dict], other_files: List[Dict]) -> str:
    """生成 References 区域内容"""
    lines = []

    # 先列出固定文件
    for f in other_files:
        lines.append(f"- [{f['file']}](references/{f['file']}) - {f['title']}")

    # 再列出模块文件
    for m in modules:
        desc = m.get('description', f"{m['name']} module details")
        lines.append(f"- [{m['file']}](references/{m['file']}) - {desc}")

    return '\n'.join(lines)


def generate_config_content(commit: str, date: str) -> str:
    """生成 Config 区域内容"""
    return f'''```yaml
last_tracked_commit: "{commit}"
last_updated: "{date}"
```'''


def update_core_modules_table(content: str, modules: List[Dict]) -> str:
    """更新 Core Modules 表格"""
    # 找到表格位置
    table_pattern = re.compile(
        r'(\| Module \| Description \| Doc \|\s*'
        r'\|[-\s|]+\|)\s*'
        r'((?:\|[^\n]+\|\s*)*)'  # 现有行
        r'(\n\*Run)',
        re.MULTILINE
    )

    match = table_pattern.search(content)
    if not match:
        return content

    # 生成新的表格行
    table_rows = []
    for m in modules:
        name = m['name']
        desc = m.get('description', '')
        file = m['file']
        table_rows.append(f"| {name} | {desc} | [详情](references/{file}) |")

    new_rows = '\n'.join(table_rows) + '\n' if table_rows else ''

    # 替换表格内容
    replacement = f'{match.group(1)}\n{new_rows}{match.group(3)}'
    return table_pattern.sub(replacement, content)


def sync_skill(target_dir: Path, commit: Optional[str] = None) -> Dict:
    """
    同步 SKILL.md

    参数:
        target_dir: 项目根目录
        commit: 可选的 commit hash，如果不提供则保持原值

    返回:
        {
            'success': bool,
            'modules': [...],
            'other_files': [...],
            'updated_regions': [...]
        }
    """
    skill_dir = target_dir / '.claude' / 'skills' / 'exploring-project'
    skill_path = skill_dir / 'SKILL.md'
    references_dir = skill_dir / 'references'

    result = {
        'success': False,
        'modules': [],
        'other_files': [],
        'updated_regions': []
    }

    if not skill_path.exists():
        result['error'] = f'SKILL.md not found: {skill_path}'
        return result

    # 读取当前内容
    content = skill_path.read_text(encoding='utf-8')

    # 扫描 references 目录
    modules, other_files = scan_references(references_dir)
    result['modules'] = modules
    result['other_files'] = other_files

    # 更新 References 区域
    refs_content = generate_references_content(modules, other_files)
    content = write_region(content, 'References', refs_content)
    result['updated_regions'].append('References')

    # 更新 Config 区域
    if commit is None:
        # 保持原有 commit
        config_region = read_region(content, 'Config')
        if config_region:
            yaml_match = YAML_BLOCK_PATTERN.search(config_region)
            if yaml_match:
                old_config = parse_yaml_simple(yaml_match.group(1))
                commit = old_config.get('last_tracked_commit', '')

    date = datetime.now().strftime('%Y-%m-%d')
    config_content = generate_config_content(commit or '', date)
    content = write_region(content, 'Config', config_content)
    result['updated_regions'].append('Config')

    # 更新 Core Modules 表格
    content = update_core_modules_table(content, modules)
    result['updated_regions'].append('Core Modules')

    # 写入文件
    skill_path.write_text(content, encoding='utf-8')

    result['success'] = True
    return result


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Sync SKILL.md with references directory')
    parser.add_argument('target_dir', nargs='?', default='.', help='Target project directory')
    parser.add_argument('--commit', '-c', help='Update last_tracked_commit to this value')
    parser.add_argument('--json', action='store_true', help='Output result as JSON')

    args = parser.parse_args()
    target_dir = Path(args.target_dir).resolve()

    result = sync_skill(target_dir, args.commit)

    if args.json:
        import json
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result['success']:
            print('✅ SKILL.md 同步完成')
            print(f"\n📁 扫描 references/ 目录:")
            print(f"  - 模块文件: {len(result['modules'])} 个")
            for m in result['modules']:
                print(f"    • {m['file']}")
            print(f"  - 其他文件: {len(result['other_files'])} 个")
            for f in result['other_files']:
                print(f"    • {f['file']}")
            print(f"\n🔄 更新区域: {', '.join(result['updated_regions'])}")
        else:
            print(f"❌ 同步失败: {result.get('error', 'Unknown error')}")
            sys.exit(1)


if __name__ == '__main__':
    main()
