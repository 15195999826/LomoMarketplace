---
allowed-tools: Write, Read, Bash(python:*), Bash(git rev-parse:*), Bash(tree:*), Bash(dir:*), Glob, Grep, AskUserQuestion
description: 初始化项目的 dev-helper 结构（模板复制、探索项目、核心模块识别）
---

## Your task

Initialize dev-helper development environment in the current project.

## Execution Flow

### Step 1: Run initialization script

Execute the Python script to check Git and copy templates:

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/init_project.py .
```

**If Git is not initialized** → Stop and inform user to run `git init` first.

**If successful** → The script will copy templates to:
- `.claude/commands/` (update-arch, session-summary, whats-next, track-module)
- `.claude/skills/exploring-project/` (SKILL.md, references/)
- `project-notes/`

### Step 2: Handle CLAUDE.md

Check if `CLAUDE.md` exists using Glob.

**If not exists**: Create new file with Dev Helper section.

**If exists**:
1. Read existing content
2. Check if `## Dev Helper` section exists
3. If not, append the section at the end

**Content to add**:

```markdown

## Dev Helper

本项目使用 dev-helper 进行项目管理。

### 必须激活的 Skill

探索项目时必须激活：`skill:exploring-project`

### 可用命令

| 命令 | 说明 |
|------|------|
| `/update-arch` | 更新项目架构文档 |
| `/session-summary [主题]` | 总结当前对话 |
| `/whats-next` | 查看待办事项和工作建议 |
| `/track-module <模块名>` | 追踪复杂模块 |
```

### Step 3: Run validation script

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/validate_init.py .
```

If validation fails, fix the reported issues before proceeding.

### Step 4: Explore project (full analysis)

Perform a comprehensive project exploration:

1. **Get directory structure**
   ```bash
   tree /F /A
   ```
   Note: Limit to first 3 levels for readability in documentation.

2. **Identify tech stack**
   - Read `package.json`, `Cargo.toml`, `pyproject.toml`, etc.
   - Read `README.md` if exists

3. **Generate references/overview.md**
   ```markdown
   # Project Overview

   ## Project Name
   [name from config]

   ## Description
   [from README or config]

   ## Tech Stack
   - Language: [...]
   - Framework: [...]
   - Build tools: [...]

   ## Key Dependencies
   | Package | Purpose |
   |---------|---------|

   ## Entry Points
   - `src/index.ts` - [description]
   ```

4. **Generate references/directory.md**
   ```markdown
   # Directory Structure

   ## Overview
   [tree output, simplified]

   ## Key Directories
   | Directory | Purpose |
   |-----------|---------|
   ```

5. **Update SKILL.md body**
   - Fill in Overview section (project name + one-line description)
   - Fill in Directory Structure section (simplified tree)

### Step 5: Identify core modules

Analyze the codebase and identify potential core modules for tracking.

**Criteria for core modules**:
- Has complex business logic
- Contains multiple files with interdependencies
- Would benefit from detailed documentation
- Examples: auth system, state management, API layer, database models

**Present candidates to user**:

Use AskUserQuestion tool to ask:

```
Based on analysis, these modules might benefit from detailed tracking:

1. [module-a] - path/to/module-a/
   Description: [brief description]

2. [module-b] - path/to/module-b/
   Description: [brief description]

Which modules would you like to track? (You can add more later with /track-module)
```

Options:
- Track all suggested modules
- Track selected modules (let user specify)
- Skip for now (can add later)

### Step 6: Create module documentation (if any selected)

For each selected module, use the create_module.py script:

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/create_module.py . {module-name} \
  --description "{description}" \
  --paths "{path1}" --paths "{path2}"
```

Example:
```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/create_module.py . auth-system \
  --description "用户认证模块" \
  --paths "src/auth/" --paths "src/middleware/auth.ts"
```

This creates `references/module_{module-name}.md` with standardized template.

Then explore the module code and fill each SECTION:
1. **core-concepts**: Key classes, interfaces, patterns
2. **design-decisions**: Architectural choices and rationale
3. **api-interfaces**: Public APIs and type definitions
4. **Usage Examples**: Common usage patterns
5. **Extension Guide**: How to extend/customize

Use Edit tool to update each section in the module file.

### Step 7: Run sync_skill.py

After generating all documents, run the sync script to update SKILL.md:

```bash
git rev-parse HEAD
python ${CLAUDE_PLUGIN_ROOT}/scripts/sync_skill.py . --commit {HEAD_COMMIT}
```

This will automatically:
- Update SKILL.md's Generated Config (last_tracked_commit, last_updated)
- Update SKILL.md's Generated References section (scan references/ directory)
- Update Core Modules table (from module_*.md files)

### Step 8: Output completion report

```
✅ dev-helper 初始化完成！

📁 Created structure:
- .claude/skills/exploring-project/SKILL.md
- .claude/skills/exploring-project/references/overview.md
- .claude/skills/exploring-project/references/directory.md
- .claude/commands/update-arch.md
- .claude/commands/session-summary.md
- .claude/commands/whats-next.md
- .claude/commands/track-module.md
- project-notes/
- CLAUDE.md [created/updated]

📊 Tracked modules: [N modules]
- [module-name] → references/module_{module-name}.md

🔗 Last tracked commit: [commit hash]

📌 Next steps:
- Run `/update-arch` anytime to update architecture docs
- Run `/track-module <name>` to add more modules to track
- Run `/session-summary` before ending a session
```

## Important Notes

- Git must be initialized before running this command
- This is a one-time setup, subsequent updates use `/update-arch`
- Module tracking is optional but recommended for complex projects
- Use `create_module.py` script to ensure consistent module file format
- Use Chinese for documentation content, English for code/technical terms
