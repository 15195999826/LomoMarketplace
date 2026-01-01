---
allowed-tools: Write, Read, Glob, Bash
description: Summarize current conversation and save to project-notes/
argument-hint: "[topic] Optional topic for the note"
---

## Your task

Summarize the current conversation and save as a session note.

## Execution Steps

### 1. Get current git commit hash

Run: `git rev-parse --short HEAD`

Save the commit hash for later use.

### 2. Review conversation content

Identify:
- Main topics discussed
- Tasks completed
- Outstanding items and follow-ups
- Key decisions made

### 3. Determine filename

Format: `YYYY-MM-DD-HHmm-topic.md`

- DateTime: Use current date AND time (24-hour format, e.g., `2026-01-01-1430`)
- Topic: Use `$ARGUMENTS` if provided, otherwise extract from conversation

### 4. Generate note content

```markdown
# [Topic]

Date: YYYY-MM-DD HH:mm
Git Commit: [commit-hash]

## Completed Work

- [List tasks completed in this session]

## Todo Items

- [ ] [Outstanding items that need follow-up]

## Key Decisions

- [Important design or technical decisions made]

## Notes

[Other relevant information]
```

### 5. Save to project-notes/

Use Write tool to save file to `project-notes/YYYY-MM-DD-HHmm-topic.md`

### 6. Report save location

```
✅ Session summary saved

File: project-notes/YYYY-MM-DD-HHmm-topic.md
Commit: [commit-hash]

Summary:
- Completed: N tasks
- Todo: M items
- Decisions: K points
```
