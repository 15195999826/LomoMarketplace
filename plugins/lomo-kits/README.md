# lomo-kits

Lomo 工具箱 — Vision 图片分析、Lovart AI 生成、Waveterm 终端控制。

## 模块开关

通过环境变量控制启用哪些模块。设为 `true` 或 `1` 启用，`false` 或 `0` 禁用。

| 环境变量 | 默认 | 模块 | Tools |
|----------|------|------|-------|
| `LOMO_ENABLE_VISION` | `true` | Vision 图片/视频分析 | `look_at`, `analyze_video` |
| `LOMO_ENABLE_LOVART` | `false` | Lovart.ai 图片/视频生成 | `lovart_generate`, `lovart_models`, `lovart_threads`, `lovart_artifacts`, `lovart_download`, `lovart_delete_thread` |
| `LOMO_ENABLE_WAVETERM` | `false` | Wave Terminal 终端控制 | `wsh_run`, `wsh_read_output`, `wsh_send_input`, `wsh_send_keys`, `wsh_select`, `wsh_block_info`, `wsh_delete_block`, `wsh_set_var`, `wsh_get_var`, `wsh_notify` |

## Vision 配置

### 必需

| 环境变量 | 说明 |
|----------|------|
| `VISION_API_BASE_URL` | Vision API 端点（如 Anthropic Messages API） |
| `VISION_API_KEY` | Vision API 密钥 |

### 可选

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `VISION_MODEL` | `claude-haiku-4-5-20251001` | 默认 Vision 模型 |
| `VISION_MAX_TOKENS` | `512` | Vision 最大输出 token |
| `VISION_CONCURRENCY` | `5` | 并发帧描述数 |
| `VISION_MODEL_PRESETS` | `{}` | JSON 模型预设映射 |
| `COPILOT_AUTH_TOKEN` | - | Copilot 前缀模型的 Bearer token |
| `ANALYZE_API_BASE_URL` | - | 视频分析 LLM 端点（analyze_video 需要） |
| `ANALYZE_API_KEY` | - | 视频分析 LLM 密钥 |
| `ANALYZE_MODEL` | `claude-sonnet-4-6-20250514` | 视频分析模型 |
| `ANALYZE_MAX_TOKENS` | `8192` | 视频分析最大输出 token |
| `FRAME_SCENE_THRESHOLD` | `0.3` | ffmpeg 场景变化阈值 |
| `FRAME_MIN_INTERVAL` | `20` | 最小帧间隔（秒） |
| `FRAME_OUTPUT_WIDTH` | `1280` | 输出帧宽度 |

## Lovart 配置

| 环境变量 | 说明 |
|----------|------|
| `LOVART_TOKEN` | Lovart.ai cookie 中的 usertoken |
| `LOVART_PROJECT` | Lovart 项目 ID（默认 `c51d5d46a06c4f7bb1b876168fcf8400`） |

## Waveterm 配置

无需额外环境变量。依赖系统 PATH 中的 `wsh` 和 `wavectl` 命令。

## Skills

| Skill | 说明 |
|-------|------|
| `/lomo-kits:look` | 用便宜的 Vision 模型分析图片（不消耗主模型 token） |

## 开发

源码在 `lomo-mcp-servers/lomo-ts-kits-server/`，打包后的单文件在 `plugins/lomo-kits/dist/index.js`。

```bash
# 开发构建（类型检查）
pnpm --filter lomo-ts-kits-server build

# 打包到 plugin dist（发布用）
pnpm --filter lomo-ts-kits-server bundle
```
