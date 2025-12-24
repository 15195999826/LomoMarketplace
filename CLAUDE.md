# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Language & Response Style
- Always respond in Chinese for explanations
- Technical terms and code can remain in English
- Use emoji (📝🔧⚡🎯) for better readability
- Provide actionable solutions, not just descriptions

## Repository Overview

This is **LomoMarketplace**, a Claude Code plugin marketplace containing custom plugins that extend Claude Code's functionality. The marketplace hosts two main plugins:

1. **UE_ReactUMG** - Unreal Engine ReactUMG development assistant
2. **InkMon** - InkMon project development assistant

## Repository Structure

```
LomoMarketplace/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace configuration and metadata
├── plugins/
│   ├── UE_ReactUMG/              # ReactUMG development plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Plugin manifest
│   │   ├── skills/               # Agent Skills for daily development
│   │   ├── agents/               # Specialized planning and debugging agents
│   │   └── commands/             # Custom slash commands
│   └── InkMon/                   # InkMon development plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── commands/
├── dev_docs/                     # Claude Code documentation reference
└── README.md
```

## Key Concepts

### Plugin Structure
Each plugin must contain:
- `.claude-plugin/plugin.json` - Plugin manifest (name, version, description, author, keywords)
- Optional directories at plugin root: `commands/`, `agents/`, `skills/`, `hooks/`

**Important**: Do NOT place `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes there.

### UE_ReactUMG Plugin Architecture

The UE_ReactUMG plugin uses a two-tier knowledge system:

**Lightweight Skills** (日常自动激活 - Auto-activate in daily development):
- `handling-colors` - Color types (SlateColor vs LinearColor)
- `handling-tarrays` - TArray must use UE.NewArray()
- `configuring-slots` - CanvasPanelSlot mapping rules
- `avoiding-pitfalls` - Component pitfalls (ComboBoxString, etc.)
- `using-keys` - Key usage rules (no coordinates as keys)
- `using-refs` - React ref vs PuerTS $ref distinction
- `using-alignment-enums` - Alignment and visibility enum values

**Specialized Agents** (按需调用 - On-demand):
- `simple-plan-reactumg` - Quick planning for simple tasks (conversational output)
- `plan-reactumg` - Formal planning for complex projects (generates documentation)
- `debug-reactumg` - Debug UI issues with root cause analysis

**Knowledge Base** (仅供 Agent 显式调用 - Explicit use by agents only):
- `reactumg-knowledge` - Complete development guide with colors, TArray, slots, components, patterns
- `reactumg-architecture` - Deep architecture analysis (three-layer architecture, Reconciler, hostConfig)

### Version Management

**Marketplace version**: Located in `.claude-plugin/marketplace.json` → `metadata.version`
**Plugin versions**: Located in each plugin's `.claude-plugin/plugin.json` → `version`

Use semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes

## Development Workflows

### Adding a New Plugin
1. Create directory structure: `plugins/<plugin-name>/.claude-plugin/`
2. Create `plugin.json` with name, description, version, author, keywords
3. Add commands/agents/skills at plugin root (NOT inside `.claude-plugin/`)
4. Register in `marketplace.json` → `plugins` array
5. Test with: `claude --plugin-dir ./plugins/<plugin-name>`

### Creating Commands
Commands are Markdown files in `commands/` directory:
- Filename becomes command name (e.g., `hello.md` → `/plugin-name:hello`)
- Support frontmatter: `description`, `argument-hint`, `allowed-tools`, `model`
- Can use `$ARGUMENTS` or `$1`, `$2`, etc. for parameters
- Can execute bash commands with `!` prefix (requires `allowed-tools: Bash(...)`)

### Creating Skills
Skills are directories in `skills/` with `SKILL.md`:
- Frontmatter requires: `name`, `description`
- Optional: `allowed-tools` to restrict tool access
- Can include supporting files (reference.md, scripts/, templates/)
- Description must explain BOTH what it does AND when to use it

### Creating Agents
Agents are Markdown files in `agents/` directory:
- Frontmatter requires: `name`, `description`
- Optional: `tools`, `model`, `permissionMode`, `skills`
- Body contains system prompt for the agent
- Use "PROACTIVELY" or "MUST BE USED" in description to encourage automatic use

### Testing Plugins Locally
```bash
# Test a single plugin
claude --plugin-dir ./plugins/UE_ReactUMG

# Test multiple plugins
claude --plugin-dir ./plugins/UE_ReactUMG --plugin-dir ./plugins/InkMon
```

## Common Pitfalls

1. **Directory Structure**: Never put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`
2. **Skill Descriptions**: Must be specific and include trigger keywords for automatic discovery
3. **Plugin Namespacing**: Commands are automatically namespaced as `/plugin-name:command-name`
4. **Version Sync**: Keep marketplace.json and plugin.json versions in sync when updating
5. **Skills vs Commands**: Skills are model-invoked (automatic), commands are user-invoked (explicit)

## UE_ReactUMG Specific Guidelines

### When Working with ReactUMG Code
- **Colors**: SlateColor uses `{SpecifiedColor: {R,G,B,A}}`, LinearColor uses `{R,G,B,A}` directly
- **TArray**: Always use `UE.NewArray()`, never JS arrays
- **ComboBoxString**: Must use ref + AddOption(), options cannot be passed as props
- **Keys**: Never use coordinates as keys; use stable identifiers
- **Slots**: CanvasPanelSlot has special Anchors/Offsets mapping rules

### Planning ReactUMG Features
- Simple tasks → Use `simple-plan-reactumg` agent (quick conversational output)
- Complex projects → Use `plan-reactumg` agent (generates formal markdown documentation)

### Debugging ReactUMG Issues
- Use `debug-reactumg` agent with checklist-based analysis
- Agent has access to complete knowledge base and architecture documentation

## Documentation References

The `dev_docs/` directory contains official Claude Code documentation for reference:
- `plugin_doc.md` - Plugin creation and structure
- `skill_doc.md` - Agent Skills authoring
- `commands_doc.md` - Slash commands
- `subagent_doc.md` - Subagents and custom agents
- `hook_doc.md` - Event hooks
- `output_style_doc.md` - Output formatting
- `Skill authoring best practices.md` - Best practices for Skills

## Installation for Users

```bash
# Add marketplace
/plugin marketplace add http://git.o.com/lmm/lomoMarketplace.git

# Install specific plugin
/plugin install UE_ReactUMG@lomoMarketplace

# Install all plugins
/plugin install UE_ReactUMG@lomoMarketplace InkMon@lomoMarketplace
```
