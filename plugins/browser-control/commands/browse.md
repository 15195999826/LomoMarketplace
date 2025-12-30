---
name: browse
description: Start browser control mode and optionally navigate to a URL
arguments:
  - name: url
    description: URL to navigate to (optional)
    required: false
---

# Browser Control Mode Activated

{{#if url}}
Navigating to: **{{url}}**

Please wait while the page loads, then I'll help you interact with it.

First, let me read the page structure to understand what's available...
{{else}}
Browser control mode is now active. I can help you:

- **Navigate**: Go to any website
- **Interact**: Click, type, scroll on pages
- **Automate**: Complete multi-step workflows
- **Read**: Understand page content and structure

**Example commands:**
- "Navigate to google.com and search for Claude AI"
- "Fill out the login form with my credentials"
- "Click the submit button"
- "Scroll down and find the pricing section"

What would you like to do?
{{/if}}

---

*Browser control skill is now active. MCP tools are available for browser automation.*
