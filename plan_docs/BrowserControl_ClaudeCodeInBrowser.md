# 浏览器内 Claude Code 终端 + 浏览器自动化控制

> 文档版本：v0.1
> 创建日期：2025-12-30
> 目标：在浏览器 Side Panel 中运行 Claude Code CLI，并通过 MCP 实现浏览器自动化控制

**核心愿景**：
- 用户在浏览器中打开 Side Panel，看到一个终端界面
- 终端连接到本地的 Claude Code CLI
- Claude Code 可以通过 MCP 工具控制浏览器（点击、输入、截图等）
- 实现自动化工作流（如：创建 Inkmon → 生图网站生成图片 → 上传图片）

---

## 1. 架构概览

### 1.1 整体架构

```
┌────────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Side Panel)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  终端 UI (xterm.js)                                           │  │
│  │  - 用户输入 → 发给本地 Claude Code                             │  │
│  │  - 显示 Claude Code 输出（支持颜色、ANSI）                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  浏览器控制执行器 (CDP Controller)                             │  │
│  │  - 接收 MCP Server 的控制指令                                  │  │
│  │  - 通过 chrome.debugger API 执行浏览器操作                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬───────────────────────────────────┘
                                 │ WebSocket (双向通信)
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  Bridge Server (Node.js)                                            │
│  ┌───────────────────────┐  ┌───────────────────────────────────┐  │
│  │  终端桥接              │  │  browser-control MCP Server       │  │
│  │  - 管理 Claude Code   │  │  - 提供浏览器控制工具              │  │
│  │    CLI 子进程         │  │  - browser_screenshot             │  │
│  │  - stdin/stdout 转发  │  │  - browser_click                  │  │
│  │  - PTY 模拟           │  │  - browser_type                   │  │
│  │                       │  │  - browser_scroll                 │  │
│  └───────────┬───────────┘  │  - browser_read_page              │  │
│              │              └───────────────────────────────────┘  │
│              │ stdio                                                │
│              ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Claude Code CLI                                               │ │
│  │  - 配置了 browser-control MCP Server                          │ │
│  │  - 调用 MCP 工具时，Bridge Server 通过 WebSocket 让浏览器执行   │ │
│  └───────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
【用户输入流程】
1. 用户在浏览器终端 UI 输入文字
2. WebSocket 发送到 Bridge Server
3. Bridge Server 写入 Claude Code CLI 的 stdin
4. Claude Code 处理并输出
5. Bridge Server 读取 stdout，通过 WebSocket 发送回浏览器
6. 终端 UI 显示输出

【浏览器控制流程】
1. Claude Code 决定调用 browser_click({x: 100, y: 200})
2. MCP Server (在 Bridge Server 中) 收到调用
3. MCP Server 通过 WebSocket 发送控制指令给浏览器
4. Chrome Extension 的 CDP Controller 执行点击
5. 执行结果通过 WebSocket 返回给 MCP Server
6. MCP Server 返回结果给 Claude Code
7. Claude Code 继续下一步操作
```

---

## 2. 核心技术详解

### 2.1 Chrome DevTools Protocol (CDP)

CDP 是 Chrome 提供的调试协议，允许程序化控制浏览器。官方 Claude 插件正是使用这个协议实现浏览器控制。

**关键 API：`chrome.debugger`**

```typescript
// 1. 连接到标签页
await chrome.debugger.attach({ tabId }, "1.3");

// 2. 发送 CDP 命令
const result = await chrome.debugger.sendCommand(
  { tabId },
  "Page.captureScreenshot",
  { format: "png" }
);

// 3. 断开连接
await chrome.debugger.detach({ tabId });
```

**核心 CDP 命令（从官方插件提取）：**

| CDP 命令 | 用途 | 参数示例 |
|----------|------|----------|
| `Input.dispatchMouseEvent` | 鼠标操作 | `{type, x, y, button, clickCount}` |
| `Input.dispatchKeyEvent` | 键盘按键 | `{type, key, code, keyCode}` |
| `Input.insertText` | 直接插入文本 | `{text}` |
| `Page.captureScreenshot` | 截图 | `{format: "png"}` |
| `Runtime.evaluate` | 执行 JS | `{expression}` |

### 2.2 鼠标事件详解（官方实现）

```typescript
// 完整的点击流程
async click(tabId, x, y, button = "left", clickCount = 1) {
  // 1. 移动鼠标到目标位置
  await this.dispatchMouseEvent(tabId, {
    type: "mouseMoved",
    x: x,
    y: y,
    button: "none",
    buttons: 0
  });

  await sleep(100); // 等待移动完成

  // 2. 按下鼠标
  await this.dispatchMouseEvent(tabId, {
    type: "mousePressed",
    x: x,
    y: y,
    button: button,
    buttons: 1,
    clickCount: clickCount
  });

  await sleep(12); // 短暂延迟

  // 3. 释放鼠标
  await this.dispatchMouseEvent(tabId, {
    type: "mouseReleased",
    x: x,
    y: y,
    button: button,
    buttons: 0,
    clickCount: clickCount
  });
}
```

**鼠标事件类型：**
- `mouseMoved` - 移动鼠标
- `mousePressed` - 按下鼠标键
- `mouseReleased` - 释放鼠标键
- `mouseWheel` - 滚轮滚动

**按钮类型：**
- `"none"` - 无按钮
- `"left"` - 左键
- `"middle"` - 中键
- `"right"` - 右键

### 2.3 键盘事件详解（官方实现）

```typescript
// 按下单个键
async pressKey(tabId, keyDef, modifiers = 0) {
  // keyDown
  await this.dispatchKeyEvent(tabId, {
    type: keyDef.text ? "keyDown" : "rawKeyDown",
    key: keyDef.key,
    code: keyDef.code,
    windowsVirtualKeyCode: keyDef.keyCode,
    modifiers: modifiers,
    text: keyDef.text ?? ""
  });

  // keyUp
  await this.dispatchKeyEvent(tabId, {
    type: "keyUp",
    key: keyDef.key,
    code: keyDef.code,
    windowsVirtualKeyCode: keyDef.keyCode,
    modifiers: modifiers
  });
}

// 输入文本（更简单的方式）
async type(tabId, text) {
  for (const char of text) {
    if (char === "\n" || char === "\r") {
      await this.pressKey(tabId, { key: "Enter", code: "Enter", keyCode: 13 });
    } else {
      await this.insertText(tabId, char);
    }
  }
}

// 直接插入文本（最简单，但不触发 keydown 事件）
async insertText(tabId, text) {
  await chrome.debugger.sendCommand(
    { tabId },
    "Input.insertText",
    { text }
  );
}
```

**键码定义（部分）：**

```typescript
const keyDefinitions = {
  enter: { key: "Enter", code: "Enter", keyCode: 13, text: "\r" },
  tab: { key: "Tab", code: "Tab", keyCode: 9 },
  backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
  escape: { key: "Escape", code: "Escape", keyCode: 27 },
  space: { key: " ", code: "Space", keyCode: 32, text: " " },
  arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  // ... 更多键定义
};
```

**修饰键（Modifiers）：**

```typescript
const modifierFlags = {
  alt: 1,
  ctrl: 2,
  control: 2,
  meta: 4,
  cmd: 4,
  command: 4,
  shift: 8
};

// 组合键示例：Ctrl+A
const ctrlModifier = 2;
await pressKey(tabId, { key: "a", code: "KeyA", keyCode: 65 }, ctrlModifier);
```

### 2.4 截图与坐标系统

```typescript
async screenshot(tabId) {
  // 1. 获取视口信息
  const viewportInfo = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    })
  });

  const { width, height, devicePixelRatio } = viewportInfo[0].result;

  // 2. 截图
  const result = await chrome.debugger.sendCommand(
    { tabId },
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false, fromSurface: true }
  );

  // 3. 处理高 DPI 屏幕
  // 截图尺寸 = 视口尺寸 × devicePixelRatio
  // 点击坐标使用的是视口坐标，不是截图坐标

  return {
    base64: result.data,
    width: width,
    height: height,
    viewportWidth: width,
    viewportHeight: height
  };
}
```

**坐标转换（重要！）：**

```typescript
// 从截图坐标转换为视口坐标（用于点击）
function screenshotToViewport(screenshotX, screenshotY, context) {
  const scaleX = context.viewportWidth / context.screenshotWidth;
  const scaleY = context.viewportHeight / context.screenshotHeight;
  return [
    Math.round(screenshotX * scaleX),
    Math.round(screenshotY * scaleY)
  ];
}
```

### 2.5 Accessibility Tree（页面结构读取）

官方插件使用 Accessibility Tree 让 AI 理解页面结构：

```typescript
// 注入到页面中的脚本 (accessibility-tree.js)
window.__generateAccessibilityTree = function(filter, depth, refId) {
  const elements = [];

  function walk(element, currentDepth) {
    if (currentDepth > depth) return;

    const role = getRole(element);  // button, link, textbox, etc.
    const name = getName(element);  // 元素的可访问名称

    // 为元素分配唯一 ID
    const uid = "ref_" + (++counter);
    elementMap[uid] = new WeakRef(element);

    // 格式化输出
    let line = " ".repeat(currentDepth) + role;
    if (name) line += ` "${name}"`;
    line += ` [${uid}]`;

    elements.push(line);

    // 递归处理子元素
    for (const child of element.children) {
      walk(child, currentDepth + 1);
    }
  }

  walk(document.body, 0);
  return elements.join("\n");
};
```

**输出示例：**
```
navigation [ref_1]
 link "Home" [ref_2] href="/home"
 link "About" [ref_3] href="/about"
main [ref_4]
 heading "Welcome" [ref_5]
 textbox "Search" [ref_6] placeholder="Enter query"
 button "Submit" [ref_7]
```

AI 可以用 `ref_7` 来点击"Submit"按钮，而不需要知道具体坐标。

### 2.6 Claude Code CLI 子进程管理

**关键问题**：浏览器无法直接启动本地程序，需要通过 Bridge Server 来管理 Claude Code CLI。

**好消息**：Claude Code CLI 可以作为**后台子进程**运行，**不需要弹出 cmd 窗口**！

#### 原理说明

```
【用户现在的使用方式】
1. 手动打开 cmd 窗口
2. 输入 claude 命令
3. 看到 Claude Code 界面
4. 开始对话

【Bridge Server 方式】
1. Bridge Server 后台启动（无窗口）
2. Bridge Server 自动启动 claude 子进程（无窗口）
3. 用户打开浏览器 Extension
4. 在 xterm.js 中看到 Claude Code 界面
5. 开始对话

用户看到的只有浏览器，没有任何 cmd 窗口！
```

#### 技术实现

```typescript
// lomo-mcp-servers/browser-control-server/src/bridge/terminal.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class ClaudeCodeManager extends EventEmitter {
  private process: ChildProcess | null = null;

  /**
   * 启动 Claude Code CLI 作为后台子进程
   * - 不显示 cmd 窗口
   * - 通过 stdin/stdout 进行通信
   */
  async start(): Promise<void> {
    this.process = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe'],  // 管道控制输入输出
      shell: true,                       // 通过 shell 启动（Windows 需要）
      windowsHide: true,                 // Windows 下隐藏窗口 ⭐关键配置
      env: {
        ...process.env,
        // 可以传递环境变量，如 API Key 等
      }
    });

    // 监听 Claude Code 的输出
    this.process.stdout?.on('data', (data: Buffer) => {
      this.emit('output', data.toString());
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('output', data.toString());  // stderr 也发送到终端显示
    });

    // 监听进程退出
    this.process.on('exit', (code) => {
      this.emit('exit', code);
      this.process = null;
    });

    // 监听进程错误
    this.process.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * 发送用户输入到 Claude Code
   * 相当于用户在 cmd 里打字
   */
  write(data: string): void {
    if (this.process?.stdin) {
      this.process.stdin.write(data);
    }
  }

  /**
   * 停止 Claude Code 进程
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * 检查进程是否在运行
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
```

#### 关键配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `stdio` | `['pipe', 'pipe', 'pipe']` | 将 stdin/stdout/stderr 都通过管道控制 |
| `shell` | `true` | Windows 下需要通过 shell 来执行 `claude` 命令 |
| `windowsHide` | `true` | **Windows 专用**：隐藏 cmd 窗口 |

#### 数据流

```
【用户在浏览器打字 "你好"】

1. xterm.js 捕获按键
2. WebSocket 发送: { type: "terminal_input", data: "你好\n" }
3. Bridge Server 收到消息
4. Bridge Server 写入 Claude Code 的 stdin: process.stdin.write("你好\n")
5. Claude Code 处理并输出响应
6. Bridge Server 读取 stdout
7. WebSocket 发送: { type: "terminal_output", data: "Claude 的回复..." }
8. xterm.js 显示输出
```

#### 进程生命周期管理

```typescript
// 完整的生命周期管理
class ClaudeCodeManager {
  // ... 上面的代码 ...

  /**
   * 自动重启机制
   * 如果 Claude Code 意外退出，自动重启
   */
  enableAutoRestart(): void {
    this.on('exit', (code) => {
      console.log(`Claude Code 退出，退出码: ${code}`);
      if (code !== 0) {
        console.log('3 秒后自动重启...');
        setTimeout(() => this.start(), 3000);
      }
    });
  }

  /**
   * 健康检查
   */
  healthCheck(): boolean {
    return this.isRunning() && !this.process?.killed;
  }
}
```

#### 前置条件

- Claude Code CLI 需要**全局安装**：`npm install -g @anthropic-ai/claude-code`
- 确保 `claude` 命令在系统 PATH 中可用
- 已完成 Claude Code 的认证配置

---

## 3. 项目结构

```
LomoMarketplace/
├── packages/
│   └── browser-bridge/              # 共享类型和协议
│       ├── src/
│       │   ├── types.ts             # 类型定义
│       │   ├── protocol.ts          # WebSocket 消息协议
│       │   └── index.ts
│       └── package.json
│
├── lomo-mcp-servers/
│   └── browser-control-server/      # Bridge Server + MCP Server
│       ├── src/
│       │   ├── index.ts             # 入口
│       │   ├── bridge/
│       │   │   ├── websocket.ts     # WebSocket 服务器
│       │   │   └── terminal.ts      # Claude Code CLI 管理
│       │   ├── mcp/
│       │   │   ├── server.ts        # MCP Server
│       │   │   └── tools/           # MCP 工具实现
│       │   │       ├── screenshot.ts
│       │   │       ├── click.ts
│       │   │       ├── type.ts
│       │   │       ├── scroll.ts
│       │   │       └── read-page.ts
│       │   └── utils/
│       │       └── logger.ts
│       └── package.json
│
├── apps/
│   └── browser-ext/                 # Chrome Extension
│       ├── src/
│       │   ├── background/
│       │   │   └── service-worker.ts
│       │   ├── sidepanel/
│       │   │   ├── index.html
│       │   │   ├── main.tsx
│       │   │   ├── App.tsx
│       │   │   ├── components/
│       │   │   │   └── Terminal.tsx  # xterm.js 封装
│       │   │   └── hooks/
│       │   │       └── useWebSocket.ts
│       │   ├── content/
│       │   │   ├── cdp-controller.ts # CDP 控制器
│       │   │   └── a11y-tree.ts      # Accessibility Tree
│       │   └── shared/
│       │       └── types.ts
│       ├── public/
│       │   └── manifest.json
│       ├── vite.config.ts
│       └── package.json
│
└── plugins/
    └── browser-control/             # Claude Code 插件配置
        ├── .claude-plugin/
        │   └── plugin.json
        ├── skills/
        │   └── browser-control.md
        ├── hooks/
        │   └── validate-browser-tool.js
        └── commands/
            └── browse.md
```

---

## 4. 详细设计

### 4.1 共享类型定义 (browser-bridge)

```typescript
// packages/browser-bridge/src/types.ts

/** WebSocket 消息类型 */
export type MessageType =
  | "terminal_input"      // 用户终端输入
  | "terminal_output"     // 终端输出
  | "browser_command"     // 浏览器控制命令
  | "browser_result"      // 浏览器控制结果
  | "connection_status";  // 连接状态

/** 终端输入消息 */
export interface TerminalInputMessage {
  type: "terminal_input";
  data: string;  // 用户输入的字符
}

/** 终端输出消息 */
export interface TerminalOutputMessage {
  type: "terminal_output";
  data: string;  // Claude Code 的输出
}

/** 浏览器控制命令 */
export interface BrowserCommand {
  type: "browser_command";
  id: string;  // 请求 ID，用于匹配响应
  action: BrowserAction;
}

/** 浏览器操作类型 */
export type BrowserAction =
  | { name: "screenshot"; params: ScreenshotParams }
  | { name: "click"; params: ClickParams }
  | { name: "type"; params: TypeParams }
  | { name: "scroll"; params: ScrollParams }
  | { name: "read_page"; params: ReadPageParams }
  | { name: "key"; params: KeyParams };

/** 截图参数 */
export interface ScreenshotParams {
  tabId?: number;
}

/** 点击参数 */
export interface ClickParams {
  coordinate?: [number, number];
  ref?: string;
  button?: "left" | "right" | "middle";
  clickCount?: 1 | 2 | 3;
  modifiers?: string;  // "ctrl+shift"
}

/** 输入文本参数 */
export interface TypeParams {
  text: string;
}

/** 滚动参数 */
export interface ScrollParams {
  direction: "up" | "down" | "left" | "right";
  amount?: number;
  coordinate?: [number, number];
}

/** 读取页面参数 */
export interface ReadPageParams {
  filter?: "all" | "interactive";
  depth?: number;
}

/** 按键参数 */
export interface KeyParams {
  key: string;  // "Enter", "Tab", "ctrl+a"
  repeat?: number;
}

/** 浏览器控制结果 */
export interface BrowserResult {
  type: "browser_result";
  id: string;  // 对应请求 ID
  success: boolean;
  data?: any;
  error?: string;
}
```

### 4.2 WebSocket 通信协议

```typescript
// packages/browser-bridge/src/protocol.ts

import type {
  TerminalInputMessage,
  TerminalOutputMessage,
  BrowserCommand,
  BrowserResult
} from "./types";

export type WSMessage =
  | TerminalInputMessage
  | TerminalOutputMessage
  | BrowserCommand
  | BrowserResult;

/** 序列化消息 */
export function serialize(message: WSMessage): string {
  return JSON.stringify(message);
}

/** 反序列化消息 */
export function deserialize(data: string): WSMessage {
  return JSON.parse(data);
}

/** 创建浏览器命令 */
export function createBrowserCommand(
  action: BrowserCommand["action"]
): BrowserCommand {
  return {
    type: "browser_command",
    id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action
  };
}
```

### 4.3 MCP Server 实现

```typescript
// lomo-mcp-servers/browser-control-server/src/mcp/server.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class BrowserControlMCPServer {
  private server: Server;
  private browserConnection: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.server = new Server(
      { name: "browser-control", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.registerTools();
  }

  /** 设置浏览器连接 */
  setBrowserConnection(ws: WebSocket) {
    this.browserConnection = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "browser_result") {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.success) {
            pending.resolve(message.data);
          } else {
            pending.reject(new Error(message.error));
          }
        }
      }
    };
  }

  /** 发送命令到浏览器并等待结果 */
  private async sendToBrowser(action: any): Promise<any> {
    if (!this.browserConnection) {
      throw new Error("浏览器未连接，请先打开 Chrome 插件");
    }

    const id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const command = { type: "browser_command", id, action };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.browserConnection!.send(JSON.stringify(command));

      // 30 秒超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("浏览器响应超时"));
        }
      }, 30000);
    });
  }

  /** 注册 MCP 工具 */
  private registerTools() {
    // 截图工具
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "browser_screenshot":
          return this.handleScreenshot(args);
        case "browser_click":
          return this.handleClick(args);
        case "browser_type":
          return this.handleType(args);
        case "browser_scroll":
          return this.handleScroll(args);
        case "browser_read_page":
          return this.handleReadPage(args);
        case "browser_key":
          return this.handleKey(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // 列出可用工具
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: [
          {
            name: "browser_screenshot",
            description: "截取当前浏览器页面的截图",
            inputSchema: {
              type: "object",
              properties: {
                tabId: { type: "number", description: "标签页 ID（可选）" }
              }
            }
          },
          {
            name: "browser_click",
            description: "点击指定位置或元素",
            inputSchema: {
              type: "object",
              properties: {
                coordinate: {
                  type: "array",
                  items: { type: "number" },
                  description: "[x, y] 坐标"
                },
                ref: {
                  type: "string",
                  description: "元素引用 ID，如 ref_1"
                },
                button: {
                  type: "string",
                  enum: ["left", "right", "middle"],
                  default: "left"
                },
                clickCount: {
                  type: "number",
                  enum: [1, 2, 3],
                  default: 1,
                  description: "1=单击, 2=双击, 3=三击"
                }
              }
            }
          },
          {
            name: "browser_type",
            description: "在当前焦点位置输入文本",
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string", description: "要输入的文本" }
              },
              required: ["text"]
            }
          },
          {
            name: "browser_scroll",
            description: "滚动页面",
            inputSchema: {
              type: "object",
              properties: {
                direction: {
                  type: "string",
                  enum: ["up", "down", "left", "right"]
                },
                amount: {
                  type: "number",
                  default: 3,
                  description: "滚动量"
                }
              },
              required: ["direction"]
            }
          },
          {
            name: "browser_read_page",
            description: "获取页面元素结构",
            inputSchema: {
              type: "object",
              properties: {
                filter: {
                  type: "string",
                  enum: ["all", "interactive"],
                  default: "interactive",
                  description: "过滤模式"
                }
              }
            }
          },
          {
            name: "browser_key",
            description: "按下键盘按键",
            inputSchema: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  description: "按键名称，如 Enter, Tab, ctrl+a"
                },
                repeat: {
                  type: "number",
                  default: 1,
                  description: "重复次数"
                }
              },
              required: ["key"]
            }
          }
        ]
      };
    });
  }

  private async handleScreenshot(args: any) {
    const result = await this.sendToBrowser({
      name: "screenshot",
      params: args
    });

    return {
      content: [
        {
          type: "image",
          data: result.base64,
          mimeType: "image/png"
        }
      ]
    };
  }

  private async handleClick(args: any) {
    if (!args.coordinate && !args.ref) {
      throw new Error("必须提供 coordinate 或 ref 参数");
    }

    const result = await this.sendToBrowser({
      name: "click",
      params: args
    });

    return {
      content: [{ type: "text", text: result.message || "点击完成" }]
    };
  }

  private async handleType(args: any) {
    if (!args.text) {
      throw new Error("text 参数必填");
    }

    const result = await this.sendToBrowser({
      name: "type",
      params: args
    });

    return {
      content: [{ type: "text", text: `已输入: "${args.text}"` }]
    };
  }

  private async handleScroll(args: any) {
    const result = await this.sendToBrowser({
      name: "scroll",
      params: args
    });

    return {
      content: [{ type: "text", text: result.message || "滚动完成" }]
    };
  }

  private async handleReadPage(args: any) {
    const result = await this.sendToBrowser({
      name: "read_page",
      params: args
    });

    return {
      content: [{ type: "text", text: result.content }]
    };
  }

  private async handleKey(args: any) {
    if (!args.key) {
      throw new Error("key 参数必填");
    }

    const result = await this.sendToBrowser({
      name: "key",
      params: args
    });

    return {
      content: [{ type: "text", text: `已按下: ${args.key}` }]
    };
  }

  /** 启动 MCP Server */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

### 4.4 CDP Controller（Chrome Extension 侧）

```typescript
// apps/browser-ext/src/content/cdp-controller.ts

/**
 * CDP 控制器
 * 封装 chrome.debugger API，提供浏览器控制能力
 */
export class CDPController {
  private tabId: number;
  private attached = false;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  /** 连接到标签页 */
  async attach(): Promise<void> {
    if (this.attached) return;

    await new Promise<void>((resolve, reject) => {
      chrome.debugger.attach({ tabId: this.tabId }, "1.3", () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.attached = true;
          resolve();
        }
      });
    });
  }

  /** 断开连接 */
  async detach(): Promise<void> {
    if (!this.attached) return;

    await new Promise<void>((resolve) => {
      chrome.debugger.detach({ tabId: this.tabId }, () => {
        this.attached = false;
        resolve();
      });
    });
  }

  /** 发送 CDP 命令 */
  private async sendCommand<T>(method: string, params?: object): Promise<T> {
    if (!this.attached) {
      await this.attach();
    }

    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId: this.tabId },
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result as T);
          }
        }
      );
    });
  }

  /** 截图 */
  async screenshot(): Promise<{ base64: string; width: number; height: number }> {
    // 获取视口信息
    const viewportInfo = await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      })
    });

    const { width, height, devicePixelRatio } = viewportInfo[0].result;

    // 截图
    const result = await this.sendCommand<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false, fromSurface: true }
    );

    return {
      base64: result.data,
      width,
      height
    };
  }

  /** 鼠标事件 */
  private async dispatchMouseEvent(params: {
    type: "mouseMoved" | "mousePressed" | "mouseReleased" | "mouseWheel";
    x: number;
    y: number;
    button?: "none" | "left" | "right" | "middle";
    buttons?: number;
    clickCount?: number;
    modifiers?: number;
    deltaX?: number;
    deltaY?: number;
  }): Promise<void> {
    await this.sendCommand("Input.dispatchMouseEvent", {
      type: params.type,
      x: Math.round(params.x),
      y: Math.round(params.y),
      button: params.button || "none",
      buttons: params.buttons ?? 0,
      clickCount: params.clickCount,
      modifiers: params.modifiers || 0,
      deltaX: params.deltaX,
      deltaY: params.deltaY
    });
  }

  /** 点击 */
  async click(
    x: number,
    y: number,
    button: "left" | "right" | "middle" = "left",
    clickCount: 1 | 2 | 3 = 1
  ): Promise<void> {
    const buttonMap = { left: 1, right: 2, middle: 4 };
    const buttons = buttonMap[button];

    // 移动鼠标
    await this.dispatchMouseEvent({
      type: "mouseMoved",
      x,
      y,
      button: "none",
      buttons: 0
    });

    await this.sleep(100);

    // 点击
    for (let i = 1; i <= clickCount; i++) {
      await this.dispatchMouseEvent({
        type: "mousePressed",
        x,
        y,
        button,
        buttons,
        clickCount: i
      });

      await this.sleep(12);

      await this.dispatchMouseEvent({
        type: "mouseReleased",
        x,
        y,
        button,
        buttons: 0,
        clickCount: i
      });

      if (i < clickCount) {
        await this.sleep(100);
      }
    }
  }

  /** 输入文本 */
  async type(text: string): Promise<void> {
    await this.sendCommand("Input.insertText", { text });
  }

  /** 按键 */
  async key(key: string, modifiers = 0): Promise<void> {
    const keyDef = this.getKeyDefinition(key);
    if (!keyDef) {
      throw new Error(`Unknown key: ${key}`);
    }

    // keyDown
    await this.sendCommand("Input.dispatchKeyEvent", {
      type: keyDef.text ? "keyDown" : "rawKeyDown",
      key: keyDef.key,
      code: keyDef.code,
      windowsVirtualKeyCode: keyDef.keyCode,
      modifiers,
      text: keyDef.text || ""
    });

    // keyUp
    await this.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: keyDef.key,
      code: keyDef.code,
      windowsVirtualKeyCode: keyDef.keyCode,
      modifiers
    });
  }

  /** 滚动 */
  async scroll(
    direction: "up" | "down" | "left" | "right",
    amount = 3
  ): Promise<void> {
    const delta = amount * 100;
    const deltaX = direction === "left" ? -delta : direction === "right" ? delta : 0;
    const deltaY = direction === "up" ? -delta : direction === "down" ? delta : 0;

    // 在页面中心滚动
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    await this.dispatchMouseEvent({
      type: "mouseWheel",
      x: centerX,
      y: centerY,
      deltaX,
      deltaY
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getKeyDefinition(key: string): {
    key: string;
    code: string;
    keyCode: number;
    text?: string;
  } | null {
    const definitions: Record<string, any> = {
      enter: { key: "Enter", code: "Enter", keyCode: 13, text: "\r" },
      tab: { key: "Tab", code: "Tab", keyCode: 9 },
      backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
      escape: { key: "Escape", code: "Escape", keyCode: 27 },
      space: { key: " ", code: "Space", keyCode: 32, text: " " },
      arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
      arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
      arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
      arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }
    };

    return definitions[key.toLowerCase()] || null;
  }
}
```

---

## 5. Chrome Extension manifest.json

```json
{
  "manifest_version": 3,
  "name": "Claude Code Browser",
  "version": "0.1.0",
  "description": "在浏览器中运行 Claude Code 并控制浏览器",

  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting",
    "debugger",
    "tabs"
  ],

  "host_permissions": ["<all_urls>"],

  "action": {
    "default_title": "Open Claude Code"
  },

  "side_panel": {
    "default_path": "sidepanel.html"
  },

  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/a11y-tree.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],

  "commands": {
    "toggle-side-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Toggle Claude Code side panel"
    }
  }
}
```

---

## 6. 开发计划

### Phase 1: 基础设施（预计 2 天）
- [ ] 创建项目结构和 package.json
- [ ] 实现 browser-bridge 共享包
- [ ] 配置 pnpm workspace

### Phase 2: Bridge Server（预计 2 天）
- [ ] WebSocket 服务器基础
- [ ] Claude Code CLI 子进程管理
- [ ] 终端 I/O 转发

### Phase 3: Chrome Extension（预计 3 天）
- [ ] Vite + React 项目搭建
- [ ] xterm.js 终端组件
- [ ] WebSocket 客户端连接
- [ ] CDP Controller 实现

### Phase 4: MCP Server（预计 2 天）
- [ ] MCP Server 骨架
- [ ] screenshot 工具
- [ ] click 工具
- [ ] type 工具
- [ ] read_page 工具

### Phase 5: Claude Code 插件（预计 1 天）
- [ ] browser-control skill
- [ ] 参数校验 hook
- [ ] /browse 命令

### Phase 6: 集成测试（预计 2 天）
- [ ] 端到端测试
- [ ] Inkmon 工作流验证
- [ ] Bug 修复

---

## 7. 风险与挑战

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| CDP 稳定性 | 操作可能失败 | 添加重试机制和错误处理 |
| WebSocket 断连 | 终端连接中断 | 自动重连机制 |
| 子进程管理 | Claude Code 崩溃 | 监控进程状态，自动重启 |
| 坐标系统混乱 | 点击位置不准 | 严格的坐标转换逻辑 |

### 7.2 用户体验风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 启动流程复杂 | 用户难以上手 | 提供一键启动脚本 |
| 终端不够流畅 | 输入延迟 | 优化 WebSocket 消息批处理 |

---

## 8. 快速开始指南

### 8.1 构建项目

```bash
# 1. 安装所有依赖
pnpm install

# 2. 构建共享包
pnpm build:browser-bridge

# 3. 构建 Bridge Server
pnpm build:browser-control

# 4. 构建 Chrome Extension
pnpm build:browser-ext
```

### 8.2 加载 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `apps/browser-ext/dist` 目录

### 8.3 启动服务

```bash
# 启动 Bridge Server
pnpm start:bridge

# 或使用启动脚本
scripts/start-browser-control.bat
```

### 8.4 使用

1. 确保 Bridge Server 正在运行
2. 在 Chrome 中点击扩展图标，打开 Side Panel
3. 终端会自动连接到 Bridge Server
4. 开始与 Claude Code 对话！

### 8.5 使用浏览器控制功能

1. 在 Claude Code 中使用 `/browse` 命令激活浏览器控制模式
2. 或直接描述你想自动化的任务，例如：
   - "帮我在京东搜索 iPhone"
   - "填写这个登录表单"
   - "点击提交按钮"

---

## 9. 参考资源

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [MCP SDK (TypeScript)](https://github.com/anthropics/mcp-typescript-sdk)
- [xterm.js](https://xtermjs.org/)
- [Vite Chrome Extension](https://crxjs.dev/vite-plugin/)
- 官方 Claude Chrome Extension 源码（ccWeb 目录）
