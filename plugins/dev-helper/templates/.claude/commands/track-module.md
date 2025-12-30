---
allowed-tools: Write, Read, Glob, Grep, AskUserQuestion, Bash(git rev-parse:*), Bash(python:*)
description: 追踪复杂模块，生成详细文档并添加到架构追踪列表
argument-hint: "<module-name> 模块名称（kebab-case）"
---

## Your task

Add a new complex module to the architecture tracking list.

## Prerequisites

- Project must have been initialized with dev-helper
- `.claude/skills/exploring-project/SKILL.md` must exist

## Execution Flow

### Step 1: Validate and gather module info

**Module name**: Use `$ARGUMENTS` if provided, otherwise ask user.

Validate format:
- Must be kebab-case (lowercase letters, numbers, hyphens)
- Examples: `attribute-system`, `auth-module`, `api-layer`

Use AskUserQuestion to collect:

1. **Module paths**: Which directories/files belong to this module?
2. **Module description**: One-line description of the module's purpose

### Step 2: Create module document using script

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/create_module.py . {module_name} \
  --description "{description}" \
  --paths "{path1}" --paths "{path2}"
```

Example:
```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/create_module.py . auth-system \
  --description "用户认证与授权模块" \
  --paths "src/auth/" --paths "src/middleware/auth.ts"
```

This creates `references/module_{module_name}.md` with standardized template.

### Step 3: Explore module code and fill SECTION content

Read the created file, then explore the module code at the tracked paths.

For each SECTION, analyze and fill:

1. **core-concepts**: Key classes, interfaces, patterns
2. **design-decisions**: Architectural choices and rationale
3. **api-interfaces**: Public APIs and type definitions
4. **formulas-algorithms**: Core algorithms (if applicable)

Also fill:
- **Usage Examples**: Common usage patterns
- **Extension Guide**: How to extend/customize
- **Common Issues**: Known gotchas and solutions

Use Edit tool to update each section in the module file.

### Step 4: Sync SKILL.md

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/sync_skill.py .
```

This automatically updates:
- SKILL.md's Generated References section
- SKILL.md's Core Modules table
- last_updated timestamp

### Step 5: Output completion report

```
✅ Module tracking added: {module_name}

📄 Created: references/module_{module_name}.md

🔗 Tracked paths:
- path/to/module/

📌 Run `/update-arch` when tracked files change to refresh documentation.
```

## SECTION Markers

The `<!-- SECTION: xxx -->` markers enable incremental updates:

```markdown
<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: types.ts, interfaces.ts -->
## 1. Core Concepts
...
<!-- END_SECTION -->
```

When `/update-arch` runs, it only regenerates sections whose TRACKED_FILES have changed.

## Tips

- Use specific paths rather than wildcards when possible
- Mark `TRACKED_FILES:` as empty for manually-maintained sections
- Keep documentation focused on architecture, not implementation details
