---
allowed-tools: Read, Write, Glob, Grep, Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(tree:*), Bash(dir:*)
description: Incremental update of project architecture documentation based on git commits
---

## Your task

Update the project architecture documentation based on git commits since last tracked.

## Context

- SKILL.md path: `.claude/skills/exploring-project/SKILL.md`
- References path: `.claude/skills/exploring-project/references/`

## Execution Steps

### 1. Read SKILL.md and extract metadata

```bash
# Get current HEAD commit
git rev-parse HEAD
```

Read `.claude/skills/exploring-project/SKILL.md` and extract:
- `last_tracked_commit` from frontmatter
- `tracked_modules` list from frontmatter

### 2. Get changed files since last tracked commit

If `last_tracked_commit` is empty or invalid, this is first run - do full update.

Otherwise:
```bash
git log {last_tracked_commit}..HEAD --name-only --pretty=format:""
```

### 3. Analyze changes and determine what to update

| Change Type | Files Affected | Action |
|-------------|----------------|--------|
| Directory structure | New/deleted folders | Update `references/directory.md` |
| Core config | package.json, tsconfig.json, etc. | Update `references/overview.md` |
| Tracked module paths | Files in tracked_modules[].paths | Update corresponding module doc |

### 4. Update affected documents

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
[Simplified tree output, max 3 levels]

## Key Directories
| Directory | Purpose |
|-----------|---------|
```

#### Module documents (if tracked_modules paths changed)
For each tracked module with changed files, update its doc following the incremental update strategy:

1. Read the current module doc
2. Identify which SECTION markers have TRACKED_FILES that intersect with changed files
3. Regenerate only those sections
4. Preserve unchanged sections

### 5. Update SKILL.md

Update the frontmatter:
- `last_tracked_commit`: current HEAD
- `last_updated`: today's date (YYYY-MM-DD)

Update the body:
- Refresh Overview section (project name + one-line description)
- Refresh Directory Structure section (simplified tree)

### 6. Output report

```
✅ Architecture documentation updated

Analyzed: N commits since {last_commit}
Changed files: M files

Updated:
- references/overview.md (tech stack changed)
- references/directory.md (new directories added)
- references/attribute-system.md (3 files in tracked paths changed)

Skipped (no changes):
- references/action-system.md

SKILL.md:
- last_tracked_commit: {new_commit}
- last_updated: {today}
```

## Important Notes

- If this is the first run (empty last_tracked_commit), do a full analysis
- Always update last_tracked_commit even if no documents were changed
- Use Chinese for document content, English for code/technical terms
- Keep SKILL.md body under 500 lines
