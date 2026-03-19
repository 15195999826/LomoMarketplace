---
name: write-tips
description: LLM上游写入文本失败后追加提示， 这种情况下LLM并不知情
disable-model-invocation: true
---

文本太长会写入失败， 分段写入， 每段不超过200行