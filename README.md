# Atomage Marketplace

Community plugins and skills for [Claude Code](https://github.com/anthropics/claude-code).

## Install

```bash
/plugin marketplace add git@github.com:ZhongsJie/marketplaces.git
```

## Directory Structure

```
.
├── .claude-plugin/
│   └── marketplace.json          # Marketplace registry
├── plugins/
│   └── <plugin-id>/
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest
│       └── skills/               # Skill prompt files
│           └── *.md
└── scripts/                      # Helper scripts
```

## Available Plugins

| Plugin | Description |
|---|---|
| github-analyzer | Analyze GitHub repository issues and pull requests |
| triton-kernel-analyzer | Analyze and optimize Triton GPU kernel performance |

## Adding Plugins

1. Create plugin directory: `plugins/<plugin-id>/`
2. Add `plugins/<plugin-id>/.claude-plugin/plugin.json`
3. Optionally add skills: `plugins/<plugin-id>/skills/*.md`
4. Update `marketplace.json` to reference the new plugin

## Categories

| Category | Description |
|---|---|
| ai | AI/LLM integrations |
| coding | Code generation and analysis |
| design | UI/UX and design tools |
| development | Development tools |
| devops | CI/CD, deployment, infrastructure |
| productivity | Workflow automation |
| testing | Testing and QA |
| utility | General utilities |