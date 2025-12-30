---
allowed-tools: Read, Glob, Bash(git status:*)
description: Read todo items from project-notes and suggest next actions
---

## Your task

Help user understand what to work on next.

## Execution Steps

### 1. Read project-notes/ directory

```bash
# Find all markdown files, sorted by date (newest first)
```

Use Glob to find all `.md` files in `project-notes/`

### 2. Extract todo items

From recent notes, find all items in format:
- `- [ ]` - Uncompleted todos
- `- [x]` - Completed todos (for context)

Identify items marked as urgent or important.

### 3. Check git status (optional)

```bash
git status --short
```

If there are uncommitted changes, remind user.

### 4. Provide suggestions

Organize todos by:
1. Priority (urgent first)
2. Recency (from recent notes)
3. Dependencies (what blocks what)

### 5. Ask user

Present the organized todo list and ask:

```
📋 Outstanding Tasks

From recent sessions:

**High Priority**
- [ ] Task 1 (from 2025-12-30-topic.md)
- [ ] Task 2

**Normal Priority**
- [ ] Task 3
- [ ] Task 4

**Git Status**
- M file1.ts (uncommitted changes)

---

Which task would you like to start with?
```
