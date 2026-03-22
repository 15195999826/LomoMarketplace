---
name: next
description: 生成交接 prompt，供粘贴到下一个 Claude Code 会话使用。适用于：当前会话结束前，把上下文和下一步目标打包成一段 prompt。
user_invocable: true
ai_invocable: false
hooks:
  Stop:
    - hooks:
        - type: command
          command: "bash ~/.claude/scripts/next-clipboard.sh"
          timeout: 5
---

You are preparing a handoff prompt for the next Claude Code conversation.

## Your task

Based on the **current session's work context** and the user's stated next goal, generate a well-structured prompt that the user can paste into a new Claude Code session.

### User's next goal:
$ARGUMENTS

### Instructions:

1. **Summarize current session context** — What was done in this session? What files were changed? What's the current state? Include any important decisions, gotchas, or unfinished work.

2. **Incorporate the user's next goal** — Weave the user's stated intent into the prompt, providing enough background so the new session can pick up without re-exploring.

3. **Generate the prompt and output it directly** — Output the prompt in a fenced ```text block. The prompt should:
   - Start with a brief context paragraph (what was done previously, current state)
   - Then clearly state the task/question for the new session
   - Include specific file paths, function names, or technical details that would save the new session from re-exploring
   - Be concise but complete — the new session should be able to start working immediately
   - Write in the same language the user used (Chinese if they spoke Chinese)

**IMPORTANT: Do NOT use any tools (no Write, no Bash, no clipboard). Just output the prompt text directly in one response for the user to copy.**
