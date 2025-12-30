# Claude Code Browser Extension

Chrome extension that brings Claude Code CLI into your browser with browser automation capabilities.

## Features

- **Terminal in Browser**: Run Claude Code CLI directly in a browser side panel
- **Browser Automation**: Claude can control the browser (click, type, scroll, etc.)
- **Page Understanding**: AI can read page structure for intelligent interactions

## Setup

### 1. Install Dependencies

```bash
cd apps/browser-ext
pnpm install
```

### 2. Build Extension

```bash
pnpm build
```

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `apps/browser-ext/dist` folder

### 4. Start Bridge Server

In a separate terminal:

```bash
pnpm --filter @lomo/browser-control-server start
```

Or use the startup script:

```bash
scripts/start-browser-control.bat
```

## Usage

1. Click the extension icon in Chrome toolbar
2. The side panel opens with a terminal
3. Terminal automatically connects to Bridge Server
4. Start chatting with Claude Code!

### Keyboard Shortcut

- `Ctrl+Shift+E` (Windows/Linux)
- `Cmd+Shift+E` (Mac)

## Architecture

```
Browser Extension (xterm.js) <--> WebSocket <--> Bridge Server
                                                     |
                                              Claude Code CLI
                                                     |
                                              MCP Server (browser tools)
```

## Development

```bash
# Watch mode (auto-rebuild on changes)
pnpm dev

# One-time build
pnpm build
```

## MCP Tools Available

When browser control skill is active, Claude has access to:

- `browser_screenshot` - Capture page screenshot
- `browser_click` - Click on elements
- `browser_type` - Type text
- `browser_key` - Press keyboard keys
- `browser_scroll` - Scroll the page
- `browser_read_page` - Read page structure
- `browser_navigate` - Navigate to URL
