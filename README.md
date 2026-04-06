# plane-cli

A command-line interface for [Plane.so](https://plane.so) project tracker, inspired by [linear-cli](https://github.com/schpet/linear-cli).

Supports both Plane Cloud and self-hosted instances.

## Requirements

- Node.js >= 18

## Install

```bash
npm install -g @mswiszcz/plane-cli
```

This installs the `plane` command globally.

## Quick Start

```bash
# Authenticate
plane auth login

# Set up project config (creates .plane.toml)
plane config

# List work items
plane wi list

# View a work item
plane wi view MYPROJ-1
```

## Commands

### Authentication

```
plane auth login [--key <key>] [--workspace <slug>] [--base-url <url>]
plane auth logout [workspace]
plane auth status
plane auth token
```

`auth login` prompts for your API key and workspace slug, validates the key against the API, and stores credentials in `~/.config/plane/credentials.toml` (permissions 0600).

For self-hosted instances, pass `--base-url https://your-plane-instance.com`.

### Configuration

```
plane config
```

Interactive wizard that creates a `.plane.toml` in the current directory with your default workspace and project. Requires prior `plane auth login`.

### Projects

```
plane project list [--json]
plane project view <id> [--json]
```

Alias: `p`. The `<id>` accepts a project UUID or identifier (e.g. `MYPROJ`).

### Work Items

```
plane work-item list [--project <id>] [--state <name>] [--label <name>] [--assignee <name>] [--limit <n>] [--json]
plane work-item view <id> [--json]
plane work-item create [--title <t>] [--description <d>] [--state <s>] [--priority <p>] [--assignee <a>] [--label <l>...] [--json]
plane work-item update <id> [--title <t>] [--state <s>] [--priority <p>] [--assignee <a>] [--label <l>...] [--json]
plane work-item delete <id> [--confirm]
```

Alias: `wi`. The `<id>` accepts a sequence ID (e.g. `MYPROJ-123`) or UUID.

When `create` is called without `--title`, it enters interactive mode and prompts for all fields.

### Comments

```
plane work-item comment list <id> [--json]
plane work-item comment add <id> [--body <text>] [--json]
```

### States, Labels, Members

```
plane state list [--json]       # alias: s
plane label list [--json]       # alias: l
plane member list [--json]      # alias: m
```

State and label commands require a project to be configured. Member list shows project members if a project is configured, otherwise workspace members.

## Configuration

### Hierarchy (highest priority first)

1. **Environment variables**: `PLANE_API_KEY`, `PLANE_BASE_URL`, `PLANE_WORKSPACE`, `PLANE_PROJECT`
2. **Project config**: `.plane.toml` or `plane.toml` (searched from cwd up to git root)
3. **Global config**: `~/.config/plane/config.toml`
4. **Credentials default**: default workspace from `~/.config/plane/credentials.toml`

### .plane.toml

```toml
workspace = "my-company"
project = "00000000-0000-0000-0000-000000000000"
# base_url = "https://my-plane.example.com"  # for self-hosted
```

The project value should be a UUID (the `plane config` wizard handles this automatically).

### Credentials

Stored in `~/.config/plane/credentials.toml`:

```toml
[default]
workspace = "my-company"

[workspaces.my-company]
api_key = "plane_api_..."
base_url = "https://api.plane.so"
```

## ID Resolution

Work items accept two ID formats:

- **Sequence ID**: `PROJ-123` (human-readable, matches Plane UI)
- **UUID**: `00000000-0000-0000-0000-000000000000`

Projects accept:

- **Identifier**: `MYPROJ` (the short project code)
- **UUID**: full UUID

The CLI resolves identifiers to UUIDs automatically via the API.

## Output

- **Default**: human-readable tables
- **`--json`**: raw JSON for scripting and piping

## Development

```bash
# Run in dev mode
npx tsx src/index.ts <command>

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Testing

### E2E Tests

The project uses [Vitest](https://vitest.dev/) for end-to-end tests that run against the live Plane API.

#### Test Structure

```
e2e/
  helpers.ts           # Test utilities (runCli, runCliJson, constants)
  auth.test.ts         # Auth status and token commands
  projects.test.ts     # Project listing and viewing
  states.test.ts       # State listing for a project
  members.test.ts      # Workspace member listing
  work-items.test.ts   # Work item CRUD lifecycle
  comments.test.ts     # Comment add and list on work items
```

#### Configuration

Tests are configured via environment variables in `e2e/.env` (copy `e2e/.env.example` to get started):

- `PLANE_TEST_API_KEY` — a Plane API key with access to the test workspace
- `PLANE_TEST_WORKSPACE` — workspace slug
- `PLANE_TEST_PROJECT_ID` — UUID of the project used for work item tests
- `PLANE_TEST_PROJECT_IDENTIFIER` — project identifier code

Tests run sequentially (not in parallel) to respect Plane's **60 requests/minute** rate limit.

#### Running Tests

```bash
cp e2e/.env.example e2e/.env  # fill in your values
npm run test:e2e
```

#### What the Tests Cover

| Test File | Tests | What It Verifies |
|---|---|---|
| `auth.test.ts` | 2 | `auth status` shows workspace/user, `auth token` prints the key |
| `projects.test.ts` | 5 | Lists projects, field validation, includes test project, view by ID, alias `p` |
| `states.test.ts` | 2 | Lists 5 states (Backlog/Todo/In Progress/Done/Cancelled), correct groups |
| `members.test.ts` | 1 | Lists workspace members, finds test user by email |
| `work-items.test.ts` | 11 | List, field validation, limit, alias `wi`, view by sequence ID, view by UUID, full create/update/delete lifecycle |
| `comments.test.ts` | 4 | Creates test work item, adds comment, lists comments, cleans up |

The work item and comment tests perform a full **create -> verify -> update -> delete** lifecycle, cleaning up after themselves.

#### Rate Limiting

Plane's API allows 60 requests per minute. If tests fail with HTTP 429, wait 60 seconds and retry. The test suite is designed to minimize API calls (e.g. `work-item list` uses the `expand` parameter instead of fetching each item individually).

## Tech Stack

- **TypeScript** with ESM modules
- **[Commander.js](https://github.com/tj/commander.js)** — CLI framework
- **[@makeplane/plane-node-sdk](https://github.com/makeplane/plane-node-sdk)** — Plane API client
- **[@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js)** — interactive prompts
- **[@iarna/toml](https://github.com/iarna/iarna-toml)** — TOML config parsing
- **[cli-table3](https://github.com/cli-table/cli-table3)** — table output formatting
- **[chalk](https://github.com/chalk/chalk)** — terminal colors
- **[Vitest](https://vitest.dev/)** — test runner

## Project Structure

```
src/
  index.ts                          # Entry point, command wiring
  config.ts                         # Config loading (TOML hierarchy, credentials)
  client.ts                         # PlaneClient factory
  output.ts                         # Table/JSON/error formatting
  resolve-id.ts                     # Sequence ID and project identifier resolution
  types.d.ts                        # Type declarations for untyped dependencies
  commands/
    auth/login.ts                   # plane auth login
    auth/logout.ts                  # plane auth logout
    auth/status.ts                  # plane auth status
    auth/token.ts                   # plane auth token
    config.ts                       # plane config (interactive wizard)
    project/list.ts                 # plane project list
    project/view.ts                 # plane project view
    state/list.ts                   # plane state list
    label/list.ts                   # plane label list
    member/list.ts                  # plane member list
    work-item/list.ts               # plane work-item list
    work-item/view.ts               # plane work-item view
    work-item/create.ts             # plane work-item create
    work-item/update.ts             # plane work-item update
    work-item/delete.ts             # plane work-item delete
    work-item/comment/list.ts       # plane work-item comment list
    work-item/comment/add.ts        # plane work-item comment add
e2e/
  helpers.ts                        # Test utilities
  auth.test.ts                      # Auth e2e tests
  projects.test.ts                  # Project e2e tests
  states.test.ts                    # State e2e tests
  members.test.ts                   # Member e2e tests
  work-items.test.ts                # Work item e2e tests
  comments.test.ts                  # Comment e2e tests
```

## License

MIT
