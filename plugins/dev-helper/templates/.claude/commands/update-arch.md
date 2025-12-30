---
allowed-tools: Read, Write, Glob, Grep, Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(python:*)
description: Incremental update of project architecture documentation based on git commits
---

## Your task

Update the project architecture documentation based on git commits since last tracked.

## Context

- SKILL.md path: `.claude/skills/exploring-project/SKILL.md`
- References path: `.claude/skills/exploring-project/references/`
- Sync script: `${CLAUDE_PLUGIN_ROOT}/scripts/sync_skill.py`

## Execution Steps

### 1. Read SKILL.md and extract last_tracked_commit

```bash
# Get current HEAD commit
git rev-parse HEAD
```

Read `.claude/skills/exploring-project/SKILL.md` and extract `last_tracked_commit` from the Generated Config region:

```markdown
<!-- region Generated Config Start -->
```yaml
last_tracked_commit: "abc123..."
last_updated: "2025-01-01"
```
<!-- region Generated Config End -->
```

### 2. Get changed files since last tracked commit

If `last_tracked_commit` is empty or invalid, this is first run - do full update.

Otherwise:
```bash
git log {last_tracked_commit}..HEAD --name-only --pretty=format:""
```

### 3. Scan module files and match changes

Read all `references/module_*.md` files and extract their `tracked_paths` from Generated Config:

```markdown
<!-- region Generated Config Start -->
```yaml
description: "..."
tracked_paths:
  - "src/auth/"
  - "src/middleware/auth.ts"
last_updated: "2025-01-01"
```
<!-- region Generated Config End -->
```

For each module, check if any changed files match its tracked_paths.

### 4. Analyze changes and determine what to update

| Change Type | Files Affected | Action |
|-------------|----------------|--------|
| Directory structure | New/deleted folders | Update `references/directory.md` |
| Core config | package.json, tsconfig.json, etc. | Update `references/overview.md` |
| Module tracked paths | Files in module's tracked_paths | Update corresponding `module_*.md` |

### 5. Update affected documents

For each affected document:

#### references/overview.md
```markdown
# Project Overview

## Project Name
[From package.json or README]

## Description
[One line description]

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

#### references/directory.md
```markdown
# Directory Structure

## Overview
[Simplified directory structure from Glob, max 3 levels]

## Key Directories
| Directory | Purpose |
|-----------|---------|
```

#### Module documents (if tracked_paths changed)

For each module with changed files, use incremental update strategy:

1. Read the current module doc
2. Identify which SECTION markers have TRACKED_FILES that intersect with changed files
3. Regenerate only those sections
4. Preserve unchanged sections
5. Update the module's Generated Config `last_updated` field

### 6. Run sync_skill.py

After updating documents, run the sync script with the new commit:

```bash
git rev-parse HEAD
python "${CLAUDE_PLUGIN_ROOT}/scripts/sync_skill.py" . --commit {HEAD_COMMIT}
```

This will automatically:
- Update SKILL.md's Generated Config (last_tracked_commit, last_updated)
- Update SKILL.md's Generated References section
- Update Core Modules table

### 7. Commit architecture changes

After sync_skill.py completes, check if there are any changes to commit:

```bash
git status --porcelain .claude/skills/exploring-project/
```

**If no changes** → Skip to step 8 (output report).

**If there are changes** → Commit them:

```bash
git add .claude/skills/exploring-project/
git commit -m "docs(arch): 更新项目架构文档

Updated:
{list of updated files}

Triggered by: /update-arch

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Replace `{list of updated files}` with actual file list, e.g.:
```
- SKILL.md (sync)
- references/overview.md (tech stack)
- references/module_auth.md (3 files changed)
```

### 8. Output report

```
✅ Architecture documentation updated

Analyzed: N commits since {last_commit}
Changed files: M files

Updated:
- references/overview.md (tech stack changed)
- references/directory.md (new directories added)
- references/module_attribute-system.md (3 files in tracked paths changed)

Skipped (no changes):
- references/module_action-system.md

SKILL.md synced:
- last_tracked_commit: {new_commit}
- last_updated: {today}

Git commit: {commit_hash} (or "No changes to commit")
```

## Important Notes

- If this is the first run (empty last_tracked_commit), do a full analysis
- Always run sync_skill.py even if no documents were changed (to update commit tracking)
- Use Chinese for document content, English for code/technical terms
- Keep SKILL.md body under 500 lines
- Architecture changes are auto-committed to keep the repository clean
- Only files under `.claude/skills/exploring-project/` are included in the commit
