---
allowed-tools: Read, Glob, Bash, Task, AskUserQuestion
description: Continue a previous session from project-notes/
argument-hint: "[path] Optional path to the note file"
---

## Your task

Resume work from a previous session note.

## Execution Steps

### 1. Locate the session note

**If `$ARGUMENTS` is provided:**
- Use the provided path directly (e.g., `project-notes/2026-01-01-1430-topic.md`)

**If no argument:**
- List all `.md` files in `project-notes/` directory
- Select the file with the **latest filename** (files are named `YYYY-MM-DD-HHmm-topic.md`, so alphabetical sorting = chronological order)
- If the filename is older format `YYYY-MM-DD-topic.md`, still select the latest by date

### 2. Read and parse the note

Read the session note file and extract:
- **Git Commit**: The commit hash recorded when the note was created
- **Todo Items**: List of outstanding tasks (marked with `- [ ]`)
- **Key Decisions**: Important context from the previous session
- **Completed Work**: What was done (for context)

### 3. Check project changes since that commit

Run: `git log --oneline <commit-hash>..HEAD`

This shows all commits made after the session note was created.

If there are changes, also run: `git diff --stat <commit-hash>..HEAD`

Summarize what changed since the last session.

### 4. Analyze Todo Items

For each uncompleted Todo Item:
- Understand what files/modules it affects
- Read relevant code if needed to provide context
- Assess if the item is still valid or already addressed by subsequent commits

### 5. Present session context to user

Display a summary:

```
📋 Continuing from: [note filename]
   Created: [date/time from note]
   Commit: [commit-hash]

📝 Changes since last session:
   - [N commits made]
   - [Brief summary of changes]

✅ Already completed (by subsequent work):
   - [Items that appear to be done]

📌 Outstanding Todo Items:
   1. [First item] - [brief context]
   2. [Second item] - [brief context]
   ...
```

### 6. Ask user which task to continue

Use AskUserQuestion to present the outstanding Todo Items as options.

If all todos appear complete, ask if the user wants to:
- Review what was done
- Start new work
- Update the session note
