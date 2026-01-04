---
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git show:*), Bash(git diff:*)
description: Review the last N commits content
argument-hint: "[N] Number of commits to review (default: 1)"
---

## Your task

Review the last N commits in the repository, analyzing the changes and providing insights.

## Arguments

- `$ARGUMENTS`: Number of commits to review (default: 1)

## Execution Steps

### 1. Parse arguments

If `$ARGUMENTS` is empty or not a number, use default value `1`.

### 2. Get commit information

```bash
git log -N --pretty=format:"%h|%s|%an|%ar"
```

Replace N with the number of commits to review.

### 3. For each commit, get detailed changes

```bash
git show <commit-hash> --stat --format="%H%n%s%n%b%n---STATS---"
```

### 4. Analyze the changes

For each commit:
1. Read the commit message and understand the intent
2. Review the file changes (additions, deletions, modifications)
3. If needed, use `git show <commit-hash> -- <file>` to see specific file changes

### 5. Generate review report

```
## Commit Review Report

### Commit 1: <short-hash> - <subject>
**Author:** <author> (<relative-time>)

**Files Changed:**
- `file1.ts` (+10/-5)
- `file2.ts` (+20/-0)

**Summary:**
[Brief description of what this commit does]

**Observations:**
- [Notable patterns or concerns]
- [Potential issues or improvements]

---

### Commit 2: ...

---

## Overall Summary

- Total commits reviewed: N
- Files affected: M
- Key changes:
  - [Major change 1]
  - [Major change 2]

## Recommendations

- [Any actionable suggestions based on the review]
```

### 6. Output the report

Present the review report to the user in a clear, readable format.
