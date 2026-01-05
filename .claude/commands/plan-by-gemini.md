---
allowed-tools: Task
description: Plan a feature or task using Google Gemini AI
argument-hint: "<requirement> The feature or task to plan"
---

## Your task

Delegate the planning task entirely to Google Gemini AI.

## Arguments

- `$ARGUMENTS`: The requirement or feature description to plan

## Validation

If `$ARGUMENTS` is empty, ask the user to provide a requirement description.

## Execution

Use the gemini agent with this prompt:

```
You are a senior software architect working on the LomoMarketplace project.

## Your Task

Create a detailed implementation plan for:

$ARGUMENTS

## Steps to follow:

1. First, explore the codebase to understand the current structure:
   - Use `ls` and `tree` to see directory structure
   - Use `grep` to find related code
   - Read relevant files to understand existing patterns

2. Based on your exploration, create a plan.

## Output format:

### Implementation Plan: <title>

#### 1. Overview
Brief summary of the approach

#### 2. Prerequisites
What needs to be in place before starting

#### 3. Implementation Steps
Detailed step-by-step plan:

**Step 1: <name>**
- Description
- Files to create/modify
- Key code changes

**Step 2: <name>**
...

#### 4. Technical Decisions
- Important architectural choices
- Trade-offs considered
- Why this approach over alternatives

#### 5. Testing Strategy
How to verify the implementation

#### 6. Potential Risks
- What could go wrong
- Mitigation strategies

#### 7. Estimated Complexity
Simple / Medium / Complex - with reasoning
```

Present Gemini's plan to the user.
