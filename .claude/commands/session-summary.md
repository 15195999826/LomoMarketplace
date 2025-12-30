---
allowed-tools: Write, Read, Glob
description: Summarize current conversation and save to project-notes/
argument-hint: "[topic] Optional topic for the note"
---

## Your task

Summarize the current conversation and save as a session note.

## Execution Steps

### 1. Review conversation content

Identify:
- Main topics discussed
- Tasks completed
- Outstanding items and follow-ups
- Key decisions made

### 2. Determine filename

Format: `YYYY-MM-DD-topic.md`

- Date: Use today's date
- Topic: Use `$ARGUMENTS` if provided, otherwise extract from conversation

### 3. Generate note content

```markdown
# [Topic]

Date: YYYY-MM-DD

## Completed Work

- [List tasks completed in this session]

## Todo Items

- [ ] [Outstanding items that need follow-up]

## Key Decisions

- [Important design or technical decisions made]

## Notes

[Other relevant information]
```

### 4. Save to project-notes/

Use Write tool to save file to `project-notes/YYYY-MM-DD-topic.md`

### 5. Report save location

```
✅ Session summary saved

File: project-notes/YYYY-MM-DD-topic.md

Summary:
- Completed: N tasks
- Todo: M items
- Decisions: K points
```
