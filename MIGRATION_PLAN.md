# 迁移计划：lomo-ts-kits-server + lomo-kits plugin

## 目标

将散落在多个项目中的 MCP 服务器合并到 LomoMarketplace 中：
1. **lomo-mcp-servers/lomo-ts-kits-server/** — 统一 TS MCP 服务器（一个进程，按 env flag 注册 tools）
2. **plugins/lomo-kits/** — Plugin 定义（skills + MCP 配置）

## 迁移源

| 来源项目 | 来源路径 | 迁移内容 |
|---------|---------|---------|
| lomo-windows-bot | `packages/video-analyzer-mcp/src/` | look-at, analyze-video, core/*, utils/* |
| lomo-windows-bot | `.claude/skills/look/` | /look skill |
| lomo-windows-bot | `.mcp.json` | env 配置参考 |
| lomoServer | `lovart/src/` | mcp.ts, client.ts, ws-client.ts, signature.ts |
| ~/.claude | `waveterm-mcp/index.ts` | wsh tools（如果存在） |

## 目标目录结构

```
LomoMarketplace/
├── plugins/
│   └── lomo-kits/                          # Plugin 定义
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── .mcp.json                       # MCP 服务器注册
│       └── skills/
│           └── look/
│               └── SKILL.md
├── lomo-mcp-servers/
│   └── lomo-ts-kits-server/                # 统一 TS MCP 服务器
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                    # 入口：读 env → 按 flag 注册 tools
│           ├── config.ts                   # 配置 + resolveModel
│           ├── types.ts                    # 共享类型
│           ├── tools/                      # 各 tool 实现
│           │   ├── look-at.ts              # 图片分析（from video-analyzer）
│           │   ├── analyze-video.ts        # 视频端到端分析（from video-analyzer）
│           │   ├── lovart-generate.ts      # Lovart 图片/视频生成（from lovart）
│           │   ├── lovart-query.ts         # Lovart 线程查询（from lovart）
│           │   └── wsh-*.ts                # Wave Terminal 操作（from waveterm-mcp）
│           ├── core/                       # 管道核心逻辑（from video-analyzer）
│           │   ├── analyze.ts
│           │   ├── classify.ts
│           │   ├── frame-extract.ts
│           │   ├── describe-frames.ts      # 批量帧描述（原 look-at.ts，重命名避免与 tools/look-at.ts 混淆）
│           │   └── validate.ts
│           ├── clients/                    # 外部服务客户端
│           │   ├── lovart/
│           │   │   ├── client.ts           # HTTP API（from lovart/client.ts）
│           │   │   ├── ws-client.ts        # WebSocket（from lovart/ws-client.ts）
│           │   │   └── signature.ts        # HMAC 签名（from lovart/signature.ts）
│           │   └── wsh.ts                  # wsh CLI 封装
│           └── utils/
│               ├── logger.ts
│               └── retry.ts
```

## 阶段计划

### Phase 0：Memory 迁移（前置准备）

**目标**：为后续开发提供上下文，不依赖任何代码迁移。

1. 确认 `D:\LomoMarketplace` 已在 CC 中打开（自动创建 project memory 目录）
2. 创建 `memory/MEMORY.md` — 项目总览 + 各 MCP 模块摘要
3. 创建 `memory/lovart.md` — 从 lomoServer memory 提取 Lovart 全部调研内容
4. 创建 `memory/lovart-reverse-engineering.md` — 完整逆向文档
5. 创建 `memory/vision-api.md` — Vision API 配置、认证策略、模型预设
6. **不删除原项目的 memory**（保留历史参考，避免破坏原项目 CC 体验）

### Phase 1：骨架 + Vision Tools 迁移（最小可用）

**目标**：lomo-ts-kits-server 能启动，look_at + analyze_video 可用。

1. 创建 `lomo-mcp-servers/lomo-ts-kits-server/` 目录
2. 创建 `package.json`（依赖：@modelcontextprotocol/sdk, zod）
3. 创建 `tsconfig.json`
4. 从 `D:\lomo-windows-bot\packages\video-analyzer-mcp\src\` 复制：
   - `types.ts` → `src/types.ts`
   - `config.ts` → `src/config.ts`
   - `utils/logger.ts` → `src/utils/logger.ts`
   - `utils/retry.ts` → `src/utils/retry.ts`
   - `tools/look-at.ts` → `src/tools/look-at.ts`
   - `tools/analyze-video.ts` → `src/tools/analyze-video.ts`
   - `core/*.ts` → `src/core/*.ts`（其中 `core/look-at.ts` 重命名为 `core/describe-frames.ts`）
5. 创建新的 `src/index.ts`：
   - 读取 env flags（`LOMO_ENABLE_VISION`, `LOMO_ENABLE_LOVART`, `LOMO_ENABLE_WAVETERM`, `LOMO_ENABLE_TEAM`）
   - 按 flag 条件注册 tools
   - Vision tools 默认开启
6. 创建 `plugins/lomo-kits/` plugin：
   - `.claude-plugin/plugin.json`
   - `.mcp.json`（引用 lomo-ts-kits-server，模板见下方）
   - `skills/look/SKILL.md`（从 lomo-windows-bot 复制）
7. 验证：安装依赖 → 构建 → 启动 MCP → look_at 可用

**`.mcp.json` 模板**：

```json
{
  "mcpServers": {
    "lomo-kits": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/../../lomo-mcp-servers/lomo-ts-kits-server/dist/index.js"],
      "env": {
        "LOMO_ENABLE_VISION": "${LOMO_ENABLE_VISION}",
        "LOMO_ENABLE_LOVART": "${LOMO_ENABLE_LOVART}",
        "LOMO_ENABLE_WAVETERM": "${LOMO_ENABLE_WAVETERM}",
        "LOMO_ENABLE_TEAM": "${LOMO_ENABLE_TEAM}",
        "VISION_API_BASE_URL": "${VISION_API_BASE_URL}",
        "VISION_API_KEY": "${VISION_API_KEY}",
        "VISION_MODEL": "${VISION_MODEL}",
        "COPILOT_AUTH_TOKEN": "${COPILOT_AUTH_TOKEN}",
        "VISION_MODEL_PRESETS": "${VISION_MODEL_PRESETS}",
        "ANALYZE_API_BASE_URL": "${ANALYZE_API_BASE_URL}",
        "ANALYZE_API_KEY": "${ANALYZE_API_KEY}",
        "ANALYZE_MODEL": "${ANALYZE_MODEL}",
        "LOVART_TOKEN": "${LOVART_TOKEN}"
      }
    }
  }
}
```

> 注意：`.mcp.json` 中的 `${VAR}` 由 Claude Code 在启动 MCP 进程时从当前 shell 环境变量中替换。
> 所有实际值来自 `claude-env.cmd`，此处只声明需要传递哪些变量。

### Phase 2：Lovart 迁移

1. 从 `D:\GodotProjects\lomoServer\lovart\src\` 复制：
   - `client.ts` → `src/clients/lovart/client.ts`
   - `ws-client.ts` → `src/clients/lovart/ws-client.ts`
   - `signature.ts` → `src/clients/lovart/signature.ts`
2. 从 `lovart/src/mcp.ts` 提取 tool 定义，重写为：
   - `src/tools/lovart-generate.ts`（generate_image / generate_video）
   - `src/tools/lovart-query.ts`（list_threads / get_artifacts / download_artifact）
3. 在 `src/index.ts` 中添加 `LOMO_ENABLE_LOVART` flag 控制
4. 补充 lovart 相关依赖到 package.json
5. 验证：`LOMO_ENABLE_LOVART=1` 启动 → lovart tools 可用

### Phase 3：Waveterm 迁移

源码位置：`C:\Users\37065\.claude\waveterm-mcp\index.ts`（自己写的 wsh 封装）

1. 从 `~/.claude/waveterm-mcp/` 复制源码，提取 tool 定义
2. 重写为 `src/tools/wsh-*.ts`（适配 lomo-ts-kits-server 的 registerXxxTools 模式）
3. 在 `src/index.ts` 中添加 `LOMO_ENABLE_WAVETERM` flag 控制
4. 补充 wsh 相关依赖到 package.json

### Phase 4：更新各项目配置

1. **lomo-windows-bot/.mcp.json** — 移除 video-analyzer，改为使用 lomo-kits plugin
2. **lomo-windows-bot/.claude/skills/look/** — 删除（已迁移到 plugin）
3. **claude-env.cmd** — 添加默认 LOMO_ENABLE_* flags
4. **各 claude-*.cmd** — 按需覆盖 flags：
   - `claude-duo-image.cmd` → 删除，改用 `claude-duo.cmd`（默认开启 vision）+ flag
   - 需要 lovart 的 cmd 加 `set LOMO_ENABLE_LOVART=1`

## 环境变量设计

### Tool Enable Flags（由 claude-*.cmd 设置，MCP 进程继承）

```
LOMO_ENABLE_VISION=1       # look_at, analyze_video（默认开启）
LOMO_ENABLE_LOVART=0       # lovart 图片/视频生成（默认关闭）
LOMO_ENABLE_WAVETERM=0     # wsh 终端操作（默认关闭）
LOMO_ENABLE_TEAM=0         # lomo-orchestrator（默认关闭）
```

### API 配置（全部由 claude-env.cmd 统一管理）

所有 API keys、tokens 和配置统一写在 `claude-env.cmd` 中，MCP 进程通过环境变量继承。
迁移到新电脑时只需复制 `claude-env.cmd` 一个文件即可。

**Plugin `.mcp.json` 不写死任何 secret**，只引用环境变量名：

```
VISION_API_BASE_URL     # Vision API 端点
VISION_API_KEY          # Vision API 密钥
VISION_MODEL            # 默认 Vision 模型
COPILOT_AUTH_TOKEN      # Copilot 认证 token
VISION_MODEL_PRESETS    # 模型预设 JSON
ANALYZE_API_BASE_URL    # 分析 API 端点
ANALYZE_API_KEY         # 分析 API 密钥
ANALYZE_MODEL           # 分析模型
LOVART_TOKEN            # Lovart 认证 token
```

### 认证策略（在 look-at.ts 中已实现）

- `copilot/*` 前缀模型 → `Authorization: Bearer ${COPILOT_AUTH_TOKEN}`
- 其他模型 → `x-api-key: ${VISION_API_KEY}`

## claude-env.cmd 更新

`claude-env.cmd` 是所有 Claude 启动器的**唯一 secrets 来源**。迁移电脑时只需复制此文件。

```cmd
@echo off
REM ========== Common ==========
set PLAYWRIGHT_MCP_EXTENSION_TOKEN=<your-token>

REM ========== Lomo MCP Kits - Feature Flags ==========
set LOMO_ENABLE_VISION=1
set LOMO_ENABLE_LOVART=0
set LOMO_ENABLE_WAVETERM=0
set LOMO_ENABLE_TEAM=0

REM ========== Vision API ==========
set VISION_API_BASE_URL=https://safeapi.inkmon.cloud/v1/messages
set VISION_API_KEY=<your-vision-api-key>
set VISION_MODEL=copilot/gemini-3-flash-preview
set COPILOT_AUTH_TOKEN=<your-copilot-token>
set VISION_MODEL_PRESETS={"gemini":"copilot/gemini-2.5-pro","gemini-pro":"copilot/gemini-3.1-pro-preview","haiku":"duo-chat-haiku-4-5","sonnet":"duo-chat-sonnet-4-6"}

REM ========== Analyze API ==========
set ANALYZE_API_BASE_URL=https://safeapi.inkmon.cloud/v1/messages
set ANALYZE_API_KEY=<your-analyze-api-key>
set ANALYZE_MODEL=duo-chat-sonnet-4-6

REM ========== Lovart ==========
set LOVART_TOKEN=<your-lovart-token>
```

> ⚠️ 实际 `claude-env.cmd` 中填写真实值，此文档中仅展示占位符。

## Plugin 安装方式

开发阶段使用本地路径，在 `~/.claude/settings.json` 中添加：

```json
{
  "enabledPlugins": {
    "lomo-kits": {
      "source": "D:\\LomoMarketplace\\plugins\\lomo-kits"
    }
  }
}
```

或使用 `claude --plugin-dir D:\LomoMarketplace\plugins\lomo-kits` 临时加载测试。

## index.ts 入口设计

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "lomo-kits", version: "1.0.0" });

// 按 env flag 条件注册 tools（支持默认值，未设置时使用 defaultVal）
const isEnabled = (key: string, defaultVal = false) =>
  process.env[key] !== undefined ? process.env[key] === '1' : defaultVal;

if (isEnabled('LOMO_ENABLE_VISION', true)) {  // Vision 默认开启
  // 注册 look_at, analyze_video
  const { registerVisionTools } = await import('./tools/look-at.js');
  const { registerVideoTools } = await import('./tools/analyze-video.js');
  registerVisionTools(server);
  registerVideoTools(server);
}

if (isEnabled('LOMO_ENABLE_LOVART')) {
  const { registerLovartTools } = await import('./tools/lovart-generate.js');
  registerLovartTools(server);
}

if (isEnabled('LOMO_ENABLE_WAVETERM')) {
  const { registerWshTools } = await import('./tools/wsh-run.js');
  registerWshTools(server);
}

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 验证清单

### 构建 & 类型检查
- [ ] `pnpm install` 无报错
- [ ] `pnpm --filter lomo-ts-kits-server build` 编译通过（无 TS 错误）
- [ ] `plugin.json` 格式正确（name, version, description 字段齐全）
- [ ] `.mcp.json` 格式正确（JSON 合法，路径可解析）

### 功能验证
- [ ] `LOMO_ENABLE_VISION=1` 启动 → look_at + analyze_video 注册
- [ ] 不设置任何 env flag 启动 → Vision tools 默认注册（isEnabled 默认值生效）
- [ ] `LOMO_ENABLE_VISION=0` 启动 → 无 vision tools
- [ ] `/look D:\test.png 描述内容` → Gemini 3 Flash 返回描述
- [ ] `look_at --model haiku` → 切换到 Haiku
- [ ] plugin 通过 `--plugin-dir` 加载 → /look skill 可用

### 清理验证
- [ ] lomo-windows-bot 的 .mcp.json 清理后无 video-analyzer 残留

### 回滚策略
- 迁移期间**不删除**原项目中的 MCP 源码和配置
- 只在 Phase 4 确认一切正常后，才清理原项目引用
- 如 Phase 1 失败，恢复 lomo-windows-bot `.mcp.json` 中的 video-analyzer 配置即可回退

## CLAUDE.md 相关内容迁移

### 需要迁移到 LomoMarketplace/CLAUDE.md 的段落

#### 来源 1：全局 CLAUDE.md (`C:\Program Files\ClaudeCode\CLAUDE.md`)

**图片分析策略**（保留在全局 CLAUDE.md，不迁移，因为是全局 AI 行为规则）：
```markdown
# 图片分析策略
- 遇到图片文件路径时，优先使用 look_at MCP tool 分析，不要用 Read 直接查看（走便宜 Vision 模型，省 token）
- 如果图片已经直接附加在对话中（你已能看到图片内容），则直接回答，不要再调 look_at（避免双重消费）
```
> 注意：此规则让 AI 自主使用 look_at MCP tool，与 /look skill 互补但不同。

#### 来源 2：lomo-windows-bot/CLAUDE.md

**Pipeline Commands 段落**（与 video-analyzer 相关，迁移到 lomo-ts-kits-server 文档）：
```markdown
## Pipeline Commands
npx tsx src/pipeline/run.ts all <BV号>
npx tsx src/pipeline/run.ts download <BV号> <taskDir>
...
```

#### 来源 3：lomoServer 项目 CLAUDE.md（如有 lovart MCP 相关段落）

需要在新会话中检查 `D:\GodotProjects\lomoServer\CLAUDE.md` 是否有 lovart MCP 相关内容。

### 迁移动作

1. 在 `LomoMarketplace/CLAUDE.md` 中新增 `## lomo-kits Plugin` 段落，包含：
   - 图片分析策略（look_at 使用规则）
   - lomo-ts-kits-server 的 tool 列表和 env flag 说明
   - Plugin 开发/测试方式
2. 全局 CLAUDE.md 的"图片分析策略"**保留不动**（全局 AI 行为规则）
3. lomo-windows-bot/CLAUDE.md 中 Pipeline Commands 保留（仍可独立运行），但标注已迁移到 plugin
4. /look skill 设置 `disable-model-invocation: true`（仅人类手动调用，AI 直接用 look_at MCP tool）

## Skills / Commands 迁移

### 迁移到 plugin 的 Skills

以下 skills 依赖 lomo-kits MCP tools，应放入 `plugins/lomo-kits/skills/`：

| 来源 | Skill 名 | 依赖的 MCP Tool | 说明 |
|------|---------|----------------|------|
| `lomo-windows-bot/.claude/skills/look/` | /look | `look_at` | 图片分析，`disable-model-invocation: true` |
| `lomo-windows-bot/.claude/skills/codex.md` | /codex | `create_async_task` | 委派任务给 GPT-5.3-Codex |
| `lomo-windows-bot/.claude/skills/opus.md` | /opus | `create_async_task` | 委派任务给 Opus |
| `lomo-windows-bot/.claude/skills/sonnet.md` | /sonnet | `create_async_task` | 委派任务给 Sonnet |
| `lomo-windows-bot/.claude/skills/haiku.md` | /haiku | `create_async_task` | 委派任务给 Haiku |
| `lomo-windows-bot/.claude/skills/gemini.md` | /gemini | `create_async_task` | 委派任务给 Gemini |
| `lomo-windows-bot/.claude/skills/glm.md` | /glm | `create_async_task` | 委派任务给 GLM |

注意：codex~glm 这 6 个 skill 是同一模板，都调用 `create_async_task`（lomo-orchestrator MCP tool）。
迁移时需要将 `.md` 格式转为 `skills/{name}/SKILL.md` 目录格式。

### 迁移到 plugin 的 Commands

| 来源 | Command 名 | 依赖的 MCP Tool | 说明 |
|------|-----------|----------------|------|
| `~/.claude/commands/ult.md` | /ult | `create_team`（lomo-orchestrator） | 创建多 Agent 团队 |

### 不迁移的（保留原位）

| 文件 | 理由 |
|------|------|
| `~/.claude/commands/setup-mcp.md` | 通用 MCP 配置知识，不绑定特定 tool |
| `~/.claude/commands/next.md` | 通用会话交接，与 MCP 无关 |
| `~/.claude/skills/pitfalls/` | 通用踩坑记录，但 `references/waveterm-pitfalls.md` 可复制一份到 plugin |
| `lomo-windows-bot/.claude/skills/playwright-cli/` | 第三方 Playwright MCP，不是我们的 |

### 迁移后的 plugin skills 目录

```
plugins/lomo-kits/skills/
├── look/SKILL.md          # 图片分析（disable-model-invocation: true）
├── codex/SKILL.md         # 委派给 Codex
├── opus/SKILL.md          # 委派给 Opus
├── sonnet/SKILL.md        # 委派给 Sonnet
├── haiku/SKILL.md         # 委派给 Haiku
├── gemini/SKILL.md        # 委派给 Gemini
├── glm/SKILL.md           # 委派给 GLM
└── ult/SKILL.md           # 创建多 Agent 团队
```

### 迁移后清理

迁移验证通过后，从原位置删除：
- `lomo-windows-bot/.claude/skills/` 中的 look/, codex.md, opus.md, sonnet.md, haiku.md, gemini.md, glm.md
- `~/.claude/commands/ult.md`
- 保留 playwright-cli/（不迁移）

## Memory 迁移

### 需要迁移的 Memory 文件

CC 的 memory 按项目隔离在 `C:\Users\37065\.claude\projects\{project-path-hash}\memory\` 下。
LomoMarketplace 对应的 memory 目录为 `C:\Users\37065\.claude\projects\D--LomoMarketplace\memory\`。
**该目录会在首次用 CC 打开 `D:\LomoMarketplace` 时自动创建。**

#### 从 lomoServer memory 提取（Lovart 相关）

**来源**: `C:\Users\37065\.claude\projects\D--GodotProjects-lomoServer\memory\`

| 文件 | 迁移内容 | 目标 |
|------|---------|------|
| `MEMORY.md` | "Lovart.ai 工具开发" 全部内容（Phase 1~3b） | `memory/lovart.md` |
| `lovart-reverse-engineering.md` | 整个文件 | `memory/lovart-reverse-engineering.md` |

**关键信息摘要**（写入新项目 `memory/MEMORY.md`）：
- Lovart 账号: `dev_ai1@ogopogo.cc`, Ultimate 会员
- 认证: HTTP header `token: {usertoken}`，WebSocket 用 query param
- 签名: HMAC-SHA256, `{ts}:{uuid}:{threadId}:{projectId}`
- 当前项目 ID: `c51d5d46a06c4f7bb1b876168fcf8400`
- MCP tools: `lovart_generate`, `lovart_threads`, `lovart_artifacts`, `lovart_download`, `lovart_models`
- 条件启动: `LOVART_ENABLED=1` env flag
- 生成器模式: `[@tool:name]` 前缀 + `thread_id_type: 5` (LumenPlanner)
- 已知问题: aspect_ratio 不精准, generator 模式 (`chat-generator`) 不可用

#### 从 lomo-windows-bot memory 提取（Vision MCP 相关）

**来源**: `C:\Users\37065\.claude\projects\D--lomo-windows-bot\memory\`

`architecture-review.md` — 这是 lomo-windows-bot 架构审核，**不迁移**（与 MCP 无关）。

**需要新建**（写入 `memory/MEMORY.md`）：
- Vision API 配置: safeapi.inkmon.cloud, 认证策略（copilot/* → Bearer, 其他 → x-api-key）
- 模型预设: gemini/gemini-pro/haiku/sonnet
- 默认模型: copilot/gemini-3-flash-preview
- /look skill: 图片路径 → look_at MCP tool → 便宜模型，避免主模型看图
- env flag 体系: LOMO_ENABLE_VISION/LOVART/WAVETERM/TEAM

### 迁移步骤

详见 **Phase 0：Memory 迁移**（已提升为最先执行的阶段）。
