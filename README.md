# Claude Code Marketplace

Community plugins and skills for [Claude Code](https://github.com/anthropics/claude-code).

## Directory Structure

```
.
├── marketplace.json          # Plugin registry (auto-updated)
├── schemas/
│   ├── marketplace.schema.json   # JSON Schema for marketplace.json
│   └── plugin.schema.json        # JSON Schema for plugin.json
├── scripts/
│   └── register-plugin.js    # CLI tool to register/update a plugin
└── plugins/
    └── <plugin-id>/
        ├── plugin.json       # Plugin manifest
        ├── skills/           # Skill prompt files (.md)
        │   └── *.md
        ├── hooks/            # Hook scripts (optional)
        └── mcp/              # MCP server config (optional)
```

## Plugin Manifest (`plugin.json`)

Each plugin directory must contain a `plugin.json` that conforms to
`schemas/plugin.schema.json`. Key fields:

| Field | Required | Description |
|---|---|---|
| `id` | ✅ | Unique slug, lowercase + hyphens |
| `name` | ✅ | Human-readable name |
| `version` | ✅ | SemVer string |
| `description` | ✅ | Short description |
| `author` | ✅ | Author name or org |
| `category` | ✅ | One of: `productivity`, `coding`, `design`, `devops`, `testing`, `ai`, `utility` |
| `skills` | ✅ | Array of skill definitions |
| `tags` | — | Searchable tags |
| `mcpServers` | — | MCP server configurations |
| `hooks` | — | Claude Code hook definitions |

## Adding a Plugin

1. Create `plugins/<your-plugin-id>/plugin.json` (use `schemas/plugin.schema.json` as reference)
2. Add skill prompts under `plugins/<your-plugin-id>/skills/*.md`
3. Register the plugin:

```bash
node scripts/register-plugin.js plugins/<your-plugin-id>
```

`marketplace.json` is updated automatically.

## Categories

| Category | Description |
|---|---|
| `ai` | AI/LLM integrations |
| `coding` | Code generation and analysis |
| `design` | UI/UX and design tools |
| `devops` | CI/CD, deployment, infrastructure |
| `productivity` | Workflow automation |
| `testing` | Testing and QA |
| `utility` | General utilities |
