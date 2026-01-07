---
allowed-tools: Read, Write, Glob, Bash, Grep
description: Archive completed session notes to project-notes/archived/
argument-hint: "[--dry-run] Preview without moving files"
---

## Your task

Archive completed session notes from `project-notes/` to `project-notes/archived/`.

## Archive Criteria

A note is considered **completed** and ready for archiving when:
1. All todo items are marked as done (`- [x]`)
2. OR there are no todo items at all

For notes with uncompleted todos (`- [ ]`):
- Verify if the actual work has been completed (check codebase/git)
- If work is done, update the todo checkboxes to `[x]` before archiving
- If work is NOT done, leave the note in place

## Execution Steps

### 1. Ensure archived directory exists

```bash
mkdir -p project-notes/archived
```

### 2. Scan session notes

Use Glob to find all `.md` files in `project-notes/` (excluding `archived/` subdirectory and `.gitkeep`).

### 3. Analyze each note

For each note file:

1. **Read the file content**
2. **Count todo items:**
   - Completed: `- [x]` pattern
   - Uncompleted: `- [ ]` pattern
3. **Determine status:**
   - `ready`: No uncompleted todos → ready to archive
   - `needs-review`: Has uncompleted todos → needs verification
   - `skip`: Already in archived/

### 4. Handle notes needing review

For notes with uncompleted todos:

1. **List the uncompleted items** to the user
2. **Check actual completion** by:
   - Looking at git history since the note date
   - Checking if mentioned features/files exist
   - Verifying test results if applicable
3. **If work is actually done:**
   - Update the note: change `- [ ]` to `- [x]`
   - Mark as ready to archive
4. **If work is NOT done:**
   - Report to user and skip archiving

### 5. Preview changes (if --dry-run)

If `$ARGUMENTS` contains `--dry-run`:
- Show what would be archived
- Do NOT move any files
- Exit after preview

### 6. Move completed notes

For each note ready to archive:

```bash
mv project-notes/[filename].md project-notes/archived/[filename].md
```

### 7. Report results

```
📦 Archive Summary

**Archived (N files):**
- 2026-01-01-topic-a.md
- 2026-01-02-topic-b.md

**Updated & Archived (M files):**
- 2026-01-03-topic-c.md (3 todos marked complete)

**Skipped (K files):**
- 2026-01-04-topic-d.md (2 uncompleted todos remain)

**Remaining active notes:** X files
```

## Output Format

Present results clearly with:
- ✅ Successfully archived
- 📝 Updated then archived (show what todos were completed)
- ⏸️ Skipped (show why, list uncompleted items)
- 📊 Final statistics
