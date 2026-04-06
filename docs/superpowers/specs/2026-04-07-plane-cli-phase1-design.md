# Plane CLI — Phase 1 Design Spec

## Overview

A command-line interface for [Plane.so](https://plane.so) project tracker, mirroring the UX patterns of [linear-cli](https://github.com/schpet/linear-cli). Phase 1 covers core authentication, configuration, work item management, and read-only access to projects, states, labels, and members.

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **CLI framework:** Commander.js
- **API client:** `@makeplane/plane-node-sdk`
- **Interactive prompts:** `@inquirer/prompts`
- **Config format:** TOML (`@iarna/toml`)
- **Output:** `cli-table3` (tables), `marked` + `marked-terminal` (markdown), `chalk` (colors)
- **Distribution:** npm global install (`bin` field in package.json)

## Project Structure

```
plane-cli/
├── src/
│   ├── index.ts              # Entry point, program definition
│   ├── config.ts             # Config loading (.plane.toml, env vars, credentials)
│   ├── client.ts             # PlaneClient factory (reads config → creates SDK client)
│   ├── output.ts             # Table/JSON output formatting helpers
│   ├── commands/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── status.ts
│   │   │   └── token.ts
│   │   ├── config.ts         # Interactive config wizard
│   │   ├── work-item/
│   │   │   ├── list.ts
│   │   │   ├── view.ts
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── comment/
│   │   │       ├── list.ts
│   │   │       └── add.ts
│   │   ├── project/
│   │   │   ├── list.ts
│   │   │   └── view.ts
│   │   ├── state/
│   │   │   └── list.ts
│   │   ├── label/
│   │   │   └── list.ts
│   │   └── member/
│   │       └── list.ts
├── package.json
├── tsconfig.json
└── .plane.toml.example
```

Each command file exports a Commander `Command` object. Commands are thin — argument parsing, SDK call, output formatting. No business logic in command files.

## Configuration

### Hierarchy (highest priority first)

1. **Environment variables:** `PLANE_API_KEY`, `PLANE_BASE_URL`, `PLANE_WORKSPACE`, `PLANE_PROJECT`
2. **Project-level config:** `.plane.toml` or `plane.toml` (searched from cwd up to git root)
3. **Global config:** `~/.config/plane/config.toml`

### `.plane.toml` format

```toml
workspace = "my-company"
project = "backend"
base_url = "https://api.plane.so"  # optional, defaults to cloud
```

### Credentials storage

Stored in `~/.config/plane/credentials.toml` with file permissions `0600`:

```toml
[workspaces.my-company]
api_key = "plane_api_..."
base_url = "https://api.plane.so"

[default]
workspace = "my-company"
```

No OS keyring in phase 1 — plaintext with restrictive file permissions.

### Client resolution

`client.ts` exports `getClient()` which:
1. Loads config hierarchy (env → project TOML → global TOML)
2. Resolves workspace slug and API key
3. Returns a configured `PlaneClient` instance from the SDK

## Authentication

### Commands

| Command | Description |
|---|---|
| `plane auth login` | Prompts for API key (or `--key` flag), validates via API call, stores in credentials file |
| `plane auth logout [workspace]` | Removes workspace credentials (defaults to current workspace) |
| `plane auth status` | Shows current workspace and user info |
| `plane auth token` | Prints raw API key (for piping) |

### `plane auth login` flags

- `--key <key>` — provide API key non-interactively
- `--workspace <slug>` — workspace name (prompted if omitted)
- `--base-url <url>` — for self-hosted instances (defaults to `https://api.plane.so`)

### Validation

On login, the CLI calls the Plane API (e.g., list workspaces) to verify the key is valid before storing.

## Command Tree

```
plane auth login [--key <key>] [--workspace <slug>] [--base-url <url>]
plane auth logout [workspace]
plane auth status
plane auth token

plane config                          # interactive setup wizard

plane work-item list [--project <id>] [--state <name>] [--label <name>] [--assignee <name>] [--limit <n>] [--json]
plane work-item view <id> [--json]    # PROJ-123 or UUID
plane work-item create [--title <t>] [--description <d>] [--state <s>] [--priority <p>] [--assignee <a>] [--label <l>...]
plane work-item update <id> [--title <t>] [--state <s>] [--priority <p>] [--assignee <a>] [--label <l>...]
plane work-item delete <id> [--confirm]
plane work-item comment list <id>
plane work-item comment add <id> [--body <text>]

plane project list [--json]
plane project view <id>

plane state list [--json]
plane label list [--json]
plane member list [--json]
```

### Aliases

| Full | Alias |
|---|---|
| `work-item` | `wi` |
| `project` | `p` |
| `state` | `s` |
| `label` | `l` |
| `member` | `m` |

## Config Wizard

`plane config` runs an interactive wizard that generates a `.plane.toml` file in the current directory:
1. Lists available workspaces (from credentials) — user selects one
2. Lists projects in that workspace — user selects default project
3. Writes `.plane.toml` with `workspace` and `project` fields

Requires prior `plane auth login`.

## ID Resolution

Users can reference work items by either:
- **Sequence ID:** `PROJ-123` — human-readable, matches Plane's UI
- **UUID:** Full UUID string

When a sequence ID is provided (matches `[A-Z]+-\d+`), the CLI:
1. Extracts the project identifier prefix (e.g., `PROJ`)
2. Extracts the sequence number (e.g., `123`)
3. Uses the SDK's search/list to resolve to the work item's UUID

## Output Formatting

- **Default:** Human-readable tables using `cli-table3`
- **`--json` flag:** Raw JSON output for scripting/piping
- **`work-item view`:** Renders description markdown in terminal using `marked-terminal`
- **Lists:** Piped through pager (`less`) when output exceeds terminal height

## Interactive Mode

When `plane work-item create` is called without `--title`, it enters interactive mode using `@inquirer/prompts`:
1. Prompts for title (required)
2. Prompts for state (select from project states)
3. Prompts for priority (select: urgent/high/medium/low/none)
4. Prompts for assignee (select from project members)
5. Prompts for labels (multi-select from project labels)
6. Prompts for description (opens `$EDITOR` or inline input)

## Dependencies

### Runtime

| Package | Purpose |
|---|---|
| `@makeplane/plane-node-sdk` | Plane API client |
| `commander` | CLI framework |
| `@inquirer/prompts` | Interactive prompts |
| `@iarna/toml` | TOML parse/stringify |
| `cli-table3` | Table output |
| `marked` | Markdown parsing |
| `marked-terminal` | Terminal markdown rendering |
| `chalk` | Colored output |

### Dev

| Package | Purpose |
|---|---|
| `typescript` | Type checking |
| `tsx` | Dev runner |

## Distribution

- npm package with `bin` field mapping `plane` → `dist/index.js`
- Install: `npm install -g plane-cli`
- Dev: `npx tsx src/index.ts`
- Node.js 18+ required (native `fetch`)
- No standalone binary in phase 1

## Out of Scope (Phase 1)

- Cycles, modules, pages, milestones, initiatives, epics
- Git/VCS integration (branch detection, `issue start`, PR creation)
- Bulk operations
- OS keyring credential storage
- OAuth 2.0 authentication
- Standalone binary distribution
- Shell completions

## Future Phases

- **Phase 2:** Work item CRUD extensions (cycles, modules), git integration (`plane work-item start`)
- **Phase 3:** Pages/documents, milestones, initiatives
- **Phase 4:** Shell completions, standalone binary, keyring storage
