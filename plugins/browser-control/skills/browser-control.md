---
name: browser-control
description: |
  Activate when user asks to control browser, automate web tasks, interact with web pages,
  or mentions: "click", "type into", "scroll", "screenshot", "navigate to", "fill form",
  "read page", "browser automation", "web automation"
globs: []
alwaysApply: false
---

# Browser Control Mode

You can control the user's browser using MCP tools. This enables web automation tasks like:
- Navigating to websites
- Clicking buttons and links
- Filling forms
- Taking screenshots
- Reading page content

## Available MCP Tools

### `browser_screenshot`
Capture a screenshot of the current browser page.

**Example:**
```
browser_screenshot()
```

### `browser_click`
Click on a specific element or coordinate.

**Parameters:**
- `coordinate`: [x, y] - Click at specific coordinates
- `ref`: string - Click element by reference ID (from `browser_read_page`)
- `button`: "left" | "right" | "middle" (default: "left")
- `clickCount`: 1 | 2 | 3 (1=single, 2=double, 3=triple click)

**Examples:**
```
browser_click({ coordinate: [500, 300] })
browser_click({ ref: "ref_7" })
browser_click({ ref: "ref_5", clickCount: 2 })  // double click
```

### `browser_type`
Type text at the current cursor position.

**Parameters:**
- `text`: string - The text to type

**Example:**
```
browser_type({ text: "Hello World" })
```

### `browser_key`
Press keyboard keys, including shortcuts.

**Parameters:**
- `key`: string - Key name (e.g., "Enter", "Tab", "ctrl+a")
- `repeat`: number - Repeat count (default: 1)

**Examples:**
```
browser_key({ key: "Enter" })
browser_key({ key: "Tab", repeat: 3 })
browser_key({ key: "ctrl+a" })  // Select all
```

### `browser_scroll`
Scroll the page in a direction.

**Parameters:**
- `direction`: "up" | "down" | "left" | "right"
- `amount`: number (default: 3)

**Example:**
```
browser_scroll({ direction: "down", amount: 5 })
```

### `browser_read_page`
Get the page structure as an accessibility tree. Each element has a unique `ref` ID for clicking.

**Parameters:**
- `filter`: "all" | "interactive" (default: "interactive")

**Example output:**
```
navigation [ref_1]
  link "Home" [ref_2] href="/home"
  link "About" [ref_3] href="/about"
main [ref_4]
  heading "Welcome" [ref_5]
  textbox "Search" [ref_6] placeholder="Enter query"
  button "Submit" [ref_7]
```

### `browser_navigate`
Navigate to a URL.

**Parameters:**
- `url`: string - The URL to navigate to

**Example:**
```
browser_navigate({ url: "https://example.com" })
```

## Workflow Pattern

1. **Understand the page**: Call `browser_read_page` first to see the page structure
2. **Find targets**: Look for `ref` IDs of elements you want to interact with
3. **Interact**: Use `browser_click({ ref: "ref_X" })` to click elements
4. **Input data**: Use `browser_type` after clicking input fields
5. **Confirm actions**: Use `browser_key({ key: "Enter" })` to submit
6. **Verify**: Call `browser_read_page` or `browser_screenshot` to confirm results

## Tips

- **Prefer `ref` over coordinates**: Using element references is more reliable than coordinates
- **Wait for page loads**: After navigation or clicks that trigger loads, call `browser_read_page` to refresh your understanding
- **Handle errors gracefully**: If an action fails, take a screenshot to understand the current state
- **Batch inputs**: Type full text strings rather than character by character
