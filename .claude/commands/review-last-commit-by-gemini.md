---
allowed-tools: Task
description: Review the last N commits using Google Gemini AI
argument-hint: "[N] Number of commits to review (default: 1)"
---

## Your task

Delegate the commit review task entirely to Google Gemini AI.

## Arguments

- `$ARGUMENTS`: Number of commits to review (default: 1, if empty use 1)

## Execution

Use the gemini agent with this prompt:

```
Review the last $ARGUMENTS commits in the current git repository.

## Steps to follow:

1. Run `git log -$ARGUMENTS --pretty=format:"%h|%s|%an|%ar"` to get commit list
2. Run `git log -$ARGUMENTS -p --stat` to get detailed changes
3. For each commit, analyze:
   - What the commit does
   - Code quality
   - Potential issues or bugs
   - Best practices compliance

## Output format:

### Commit Review Report

#### Commit 1: <hash> - <subject>
**Author:** <author> (<time>)
**Files Changed:** list files with +/- lines
**Summary:** what this commit does
**Code Quality:** assessment
**Issues Found:** any problems
**Suggestions:** improvements

---

#### Overall Summary
- Total commits reviewed
- Key changes
- Main concerns
- Recommendations

#### Rating: X/10
```

Present Gemini's review to the user.
