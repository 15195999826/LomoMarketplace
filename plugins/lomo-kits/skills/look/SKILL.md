---
name: look
description: 用便宜的 Vision 模型分析图片（不消耗主模型 token）
---

用户希望用便宜的 Vision 模型（默认 Gemini 3 Flash）分析图片，而不是让你（昂贵的主模型）直接看图。

## 重要原则

- **绝对不要用 Read 工具读取图片文件** — 那会让你（主模型）直接看到图片，浪费昂贵 token
- **必须调用 `look_at` MCP tool** — 它会把图片发给便宜的 Vision 模型处理

## 参数解析

用户输入格式：`/look <图片路径> [目标] [--model 模型]`

- 第一个参数：图片路径（必须是绝对路径）
- 后续文字：分析目标（goal）。如果用户没给，默认用 "详细描述这张图片的内容"
- `--model` 或 `-m`：可选，指定模型预设

### 模型预设

| 预设名 | 模型 | 适合场景 |
|--------|------|----------|
| （不指定） | Gemini 3 Flash | 默认，快速+免费额度 |
| `gemini` | Gemini 2.5 Pro | 更强的视觉推理 |
| `gemini-pro` | Gemini 3.1 Pro | 视觉理解最强 |
| `haiku` | Claude Haiku 4.5 | 最快最便宜 |
| `sonnet` | Sonnet 4.6 | 平衡型 |

## 你的工作流

### Step 1: 解析参数
从用户输入中提取 imagePath、goal、model。

### Step 2: 调用 look_at
调用 MCP tool `look_at`：
- `imagePath`: 图片绝对路径
- `goal`: 分析目标
- `model`: 模型预设名（如果用户指定了）
- `maxTokens`: 不指定，使用默认值 1024

### Step 3: 返回结果
将 look_at 的返回文本直接展示给用户。如果用户后续有追问，继续调用 look_at（不要自己看图）。

## 示例

```
/look D:\workspace\screenshot.png 这个UI有什么问题
/look D:\frames\frame_001.png 描述画面内容 --model flash
/look D:\test.jpg --model gemini-pro
```
