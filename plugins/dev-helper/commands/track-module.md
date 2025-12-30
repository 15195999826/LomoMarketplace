---
allowed-tools: Write, Read, Glob, Grep, AskUserQuestion, Bash(git rev-parse:*)
description: 追踪复杂模块，生成详细文档并添加到架构追踪列表
argument-hint: "<module-name> 模块名称（kebab-case）"
---

## Your task

Add a new complex module to the architecture tracking list and generate detailed documentation.

## Prerequisites

- Project must have been initialized with `/dev-helper:init`
- `.claude/skills/exploring-project/SKILL.md` must exist

## Execution Flow

### Step 1: Validate module name

The module name should be provided as `$ARGUMENTS`.

**If not provided**: Ask user for module name.

**Validate format**:
- Must be kebab-case (lowercase letters, numbers, hyphens)
- Examples: `attribute-system`, `auth-module`, `api-layer`

### Step 2: Gather module information

Use AskUserQuestion to collect:

**Question 1: Module paths**
```
Which directories/files belong to this module?

Examples:
- packages/framework/src/core/attributes/
- src/services/auth/**/*.ts

Enter paths (comma-separated or one per line):
```

**Question 2: Module description**
```
Briefly describe this module's purpose (one sentence):
```

### Step 3: Explore module code

Read the specified paths and analyze:

1. **Identify key files**
   - Entry points (index.ts, mod.rs, __init__.py)
   - Type definitions
   - Core implementation files

2. **Extract concepts**
   - Main classes/interfaces
   - Key functions
   - Important constants/enums

3. **Understand relationships**
   - Dependencies on other modules
   - Exported APIs

### Step 4: Generate module documentation

Create `references/[module-name].md` with this structure:

```markdown
# [Module Name] Details

> Last updated: YYYY-MM-DD
> Tracked paths: `path/to/module/`

<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: types.ts, interfaces.ts -->
## 1. Core Concepts

| Concept | Responsibility |
|---------|----------------|
| [Name] | [Description] |

Key concepts explanation...
<!-- END_SECTION -->

<!-- SECTION: design-decisions -->
<!-- TRACKED_FILES: -->
## 2. Design Decisions

### 2.1 [Decision Point]
**Decision**: What was decided
**Rationale**: Why this approach was chosen

(Analyze from code comments, patterns, or architecture)
<!-- END_SECTION -->

<!-- SECTION: api-interfaces -->
<!-- TRACKED_FILES: index.ts, *.ts -->
## 3. Core Interfaces

```typescript
// Key interfaces extracted from code
interface IExample {
  // ...
}

// Key types
type ExampleType = ...;
```

### 3.1 Public API

| API | Description |
|-----|-------------|
| `function()` | What it does |
<!-- END_SECTION -->

<!-- SECTION: formulas-algorithms -->
<!-- TRACKED_FILES: -->
## 4. Formulas / Core Algorithms

(If applicable - math formulas, state machines, key algorithms)
<!-- END_SECTION -->

## 5. Usage Examples

```typescript
// How to use this module
import { ... } from '...';

// Example usage
```

## 6. Extension Guide

How to extend this module:

1. **Adding new X**: ...
2. **Customizing Y**: ...

## 7. Common Issues

| Issue | Solution |
|-------|----------|
| [Problem] | [How to fix] |
```

### Step 5: Update SKILL.md

1. **Update frontmatter** - Add to `tracked_modules`:
   ```yaml
   tracked_modules:
     - name: [module-name]
       paths: ["path/to/module/"]
       doc: references/[module-name].md
   ```

2. **Update Core Modules table**:
   ```markdown
   | [module-name] | [description] | [详情](references/[module-name].md) |
   ```

3. **Update References list**:
   ```markdown
   - [module-name.md](references/[module-name].md) - [Module Name] details
   ```

4. **Update last_updated**: today's date

### Step 6: Output completion report

```
✅ Module tracking added: [module-name]

📄 Created: references/[module-name].md

📊 Document structure:
- Core Concepts: N items
- Design Decisions: M points
- API Interfaces: K exports
- Usage Examples: ✓
- Extension Guide: ✓

🔗 Tracked paths:
- path/to/module/

📌 The module will be updated automatically when files in tracked paths change.
   Run `/update-arch` to trigger an update check.
```

## SECTION Markers Explanation

The `<!-- SECTION: xxx -->` markers enable incremental updates:

- `SECTION: [name]` - Start of a section
- `TRACKED_FILES: file1.ts, file2.ts` - Files that trigger section regeneration
- `END_SECTION` - End of section

When `/update-arch` runs:
1. It checks if any TRACKED_FILES have changed since last commit
2. If yes, only that section is regenerated
3. Unchanged sections are preserved

**Example**:
```markdown
<!-- SECTION: api-interfaces -->
<!-- TRACKED_FILES: index.ts, types.ts -->
## 3. Core Interfaces
...
<!-- END_SECTION -->
```
If `index.ts` is modified, this section will be regenerated while others remain unchanged.

## Tips

- Use specific paths rather than wildcards when possible
- Mark `TRACKED_FILES:` as empty for manually-maintained sections
- Add common issues as you discover them during development
- Keep the document focused on architecture, not implementation details
