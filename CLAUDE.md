# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code Marketplace** repository - a plugin registry for Claude Code extensions. It contains plugin manifests, skill definitions, and the central `marketplace.json` registry.

## Common Commands

```bash
# Register a new plugin (updates marketplace.json automatically)
node scripts/register-plugin.js plugins/<plugin-id>

# Validate a plugin against the schema
# (Use JSON Schema validators - the schemas are in schemas/)
```

## Architecture

- **`marketplace.json`**: Central plugin registry. Auto-updated by `register-plugin.js`.
- **`schemas/`**: JSON Schema definitions for validation (`marketplace.schema.json`, `plugin.schema.json`).
- **`plugins/<plugin-id>/`**: Each plugin is a directory containing:
  - `plugin.json` - Plugin manifest (required)
  - `skills/*.md` - Skill prompt files
  - `hooks/` - Hook scripts (optional)
  - `mcp/` - MCP server config (optional)

## Plugin Schema

Required `plugin.json` fields: `id`, `name`, `version`, `description`, `author`, `category`, `skills`.

Valid categories: `ai`, `coding`, `design`, `devops`, `productivity`, `testing`, `utility`.

## Adding a Plugin

1. Create `plugins/<your-plugin-id>/plugin.json`
2. Add skill prompts under `plugins/<your-plugin-id>/skills/*.md`
3. Run `node scripts/register-plugin.js plugins/<your-plugin-id>`

After running step 3, `marketplace.json` will be automatically updated.