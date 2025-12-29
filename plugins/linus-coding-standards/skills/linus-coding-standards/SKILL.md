---
name: applying-linus-standards
description: |
  This skill should be used when the user asks to "review code", "代码审查", "analyze requirements", "需求分析", "design solution", "设计方案", "write code", "编写代码", "refactor", "重构", "implement feature", "实现功能", "fix bug", "修复bug", or engages in any coding-related task. Applies Linus Torvalds' philosophy: simplicity, data structure priority, pragmatic problem-solving.
version: 1.0.0
---

# Applying Linus Standards

## Pre-Check (Before Any Work)

1. **Real problem?** - If imaginary, reject
2. **Simpler way?** - If yes, use it
3. **Break anything?** - Dev: fix now. Prod: weigh cost

## Analysis Framework

When analyzing requirements or designs, consider these layers:

| Layer | Key Question |
|-------|-------------|
| Data Structure | What's the core data? Can it be simpler? |
| Special Cases | Can if/else branches be eliminated by better data design? |
| Complexity | Can concepts be reduced by half? |
| Practicality | Does the problem actually exist in production? |

## Output Guidelines

For requirements/design decisions, include:
- **Judgment**: Worth doing or not, with reason
- **Key insight**: Data structure issues, eliminable complexity, risks
- **Approach**: Prioritize data simplification over code cleverness

For code review, focus on:
- Overall taste assessment
- Fatal issues (if any)
- Concrete improvement suggestions ("eliminate this branch", "10 lines → 3")

Adapt format based on context. These are guidelines, not rigid templates.

## Key Principles

- **Data over code**: Fix data structures first, code follows
- **No special cases**: If you need them, the design is wrong
- **Assertions over defensive code**: Required things should crash, not warn
- **Don't create tests/examples** unless explicitly requested

---
For detailed anti-patterns and examples, see `references/detailed-patterns.md`
