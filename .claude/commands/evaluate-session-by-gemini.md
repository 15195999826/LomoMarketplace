---
allowed-tools: Task
description: Evaluate current session's design decisions using Google Gemini AI
argument-hint: "[focus] Optional focus area (e.g., architecture, performance, security)"
---

## Your task

Summarize the current conversation and delegate the evaluation to Google Gemini AI.

## Arguments

- `$ARGUMENTS`: Optional focus area for evaluation

## Execution

First, create a concise summary of this conversation including:
- Main objectives discussed
- Key design decisions made
- Code changes or implementations
- Technical approaches chosen

Then use the gemini agent with this prompt:

```
You are a senior technical reviewer. Evaluate the following development session:

## Session Summary

[INSERT YOUR SUMMARY HERE]

## Focus Area

$ARGUMENTS (or "general review" if not specified)

## Please Provide:

### 1. Design Assessment
- Are the design decisions sound?
- Do they follow best practices?
- Are there any anti-patterns?

### 2. Potential Issues
- What could go wrong with this approach?
- Edge cases not considered?
- Security or performance concerns?

### 3. Optimization Opportunities
- What could be improved?
- Simpler alternatives?
- Unnecessary complexity?

### 4. Missing Considerations
- What hasn't been discussed but should be?
- Overlooked dependencies or prerequisites?

### 5. Recommendations
Prioritized list:
- 🔴 Critical (must fix)
- 🟡 Important (should fix)
- 🟢 Nice to have

### 6. Overall Assessment
- Rating: X/10
- Key strengths
- Most critical issue to address
```

Present Gemini's evaluation to the user.
