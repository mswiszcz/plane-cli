# Plane CLI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool for Plane.so that supports auth, config, work item CRUD, comments, and read-only project/state/label/member listing.

**Architecture:** Commander.js CLI with `@makeplane/plane-node-sdk` as the API client. Config is TOML-based with a hierarchy (env vars > project `.plane.toml` > global config). Credentials stored in `~/.config/plane/credentials.toml`.

**Tech Stack:** Node.js 18+, TypeScript, Commander.js, @makeplane/plane-node-sdk, @inquirer/prompts, @iarna/toml, cli-table3, marked + marked-terminal, chalk

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, bin entry, scripts |
| `tsconfig.json` | TypeScript config |
| `.plane.toml.example` | Example project config |
| `src/index.ts` | Entry point — assembles all commands into program |
| `src/config.ts` | Loads config hierarchy (env → project TOML → global TOML), loads/saves credentials |
| `src/client.ts` | Exports `getClient()` — resolves config and returns `PlaneClient` |
| `src/output.ts` | Table formatting, JSON output, pager |
| `src/resolve-id.ts` | Parses `PROJ-123` sequence IDs, resolves to UUID via SDK |
| `src/commands/auth/login.ts` | `plane auth login` command |
| `src/commands/auth/logout.ts` | `plane auth logout` command |
| `src/commands/auth/status.ts` | `plane auth status` command |
| `src/commands/auth/token.ts` | `plane auth token` command |
| `src/commands/config.ts` | `plane config` interactive wizard |
| `src/commands/work-item/list.ts` | `plane work-item list` |
| `src/commands/work-item/view.ts` | `plane work-item view` |
| `src/commands/work-item/create.ts` | `plane work-item create` (flags + interactive) |
| `src/commands/work-item/update.ts` | `plane work-item update` |
| `src/commands/work-item/delete.ts` | `plane work-item delete` |
| `src/commands/work-item/comment/list.ts` | `plane work-item comment list` |
| `src/commands/work-item/comment/add.ts` | `plane work-item comment add` |
| `src/commands/project/list.ts` | `plane project list` |
| `src/commands/project/view.ts` | `plane project view` |
| `src/commands/state/list.ts` | `plane state list` |
| `src/commands/label/list.ts` | `plane label list` |
| `src/commands/member/list.ts` | `plane member list` |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.plane.toml.example`
- Create: `.gitignore`
- Create: `src/index.ts`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "plane-cli",
  "version": "0.1.0",
  "description": "CLI for Plane.so project tracker",
  "type": "module",
  "bin": {
    "plane": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@makeplane/plane-node-sdk": "^0.2.9",
    "commander": "^13.1.0",
    "@inquirer/prompts": "^7.5.0",
    "@iarna/toml": "^2.2.5",
    "cli-table3": "^0.6.5",
    "marked": "^15.0.7",
    "marked-terminal": "^7.3.0",
    "chalk": "^5.4.1"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "tsx": "^4.19.3",
    "@types/node": "^22.14.1",
    "@types/cli-table3": "^0.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 4: Create .plane.toml.example**

```toml
# Plane CLI project configuration
# Copy to .plane.toml and fill in your values

workspace = "my-company"
project = "backend"
# base_url = "https://api.plane.so"  # uncomment for self-hosted
```

- [ ] **Step 5: Create minimal src/index.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();
program
  .name("plane")
  .description("CLI for Plane.so project tracker")
  .version("0.1.0");

program.parse();
```

- [ ] **Step 6: Install dependencies and verify**

Run: `npm install`
Then: `npx tsx src/index.ts --help`
Expected: Shows "CLI for Plane.so project tracker" with --version and --help

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore .plane.toml.example src/index.ts package-lock.json
git commit -m "feat: scaffold plane-cli project with dependencies"
```

---

### Task 2: Config System

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create src/config.ts with config loading and credential management**

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import TOML from "@iarna/toml";

export interface PlaneConfig {
  workspace?: string;
  project?: string;
  base_url?: string;
}

export interface WorkspaceCredential {
  api_key: string;
  base_url: string;
}

export interface CredentialsFile {
  default?: { workspace?: string };
  workspaces?: Record<string, WorkspaceCredential>;
}

const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "plane");
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, "config.toml");
const CREDENTIALS_PATH = join(GLOBAL_CONFIG_DIR, "credentials.toml");
const PROJECT_CONFIG_NAMES = [".plane.toml", "plane.toml"];
const DEFAULT_BASE_URL = "https://api.plane.so";

function findGitRoot(): string | null {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function findProjectConfig(): PlaneConfig | null {
  const searched = new Set<string>();
  let dir = process.cwd();
  const gitRoot = findGitRoot();
  const stopAt = gitRoot ?? dirname(dir);

  while (true) {
    if (searched.has(dir)) break;
    searched.add(dir);
    for (const name of PROJECT_CONFIG_NAMES) {
      const filePath = join(dir, name);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        return TOML.parse(content) as unknown as PlaneConfig;
      }
    }
    if (dir === stopAt || dir === dirname(dir)) break;
    dir = dirname(dir);
  }
  return null;
}

function loadGlobalConfig(): PlaneConfig | null {
  if (!existsSync(GLOBAL_CONFIG_PATH)) return null;
  const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
  return TOML.parse(content) as unknown as PlaneConfig;
}

export function loadCredentials(): CredentialsFile {
  if (!existsSync(CREDENTIALS_PATH)) return {};
  const content = readFileSync(CREDENTIALS_PATH, "utf-8");
  return TOML.parse(content) as unknown as CredentialsFile;
}

export function saveCredentials(creds: CredentialsFile): void {
  mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, TOML.stringify(creds as any), "utf-8");
  chmodSync(CREDENTIALS_PATH, 0o600);
}

export function resolveConfig(): PlaneConfig {
  const envConfig: PlaneConfig = {};
  if (process.env.PLANE_WORKSPACE) envConfig.workspace = process.env.PLANE_WORKSPACE;
  if (process.env.PLANE_PROJECT) envConfig.project = process.env.PLANE_PROJECT;
  if (process.env.PLANE_BASE_URL) envConfig.base_url = process.env.PLANE_BASE_URL;

  const projectConfig = findProjectConfig() ?? {};
  const globalConfig = loadGlobalConfig() ?? {};

  return {
    workspace: envConfig.workspace ?? projectConfig.workspace ?? globalConfig.workspace,
    project: envConfig.project ?? projectConfig.project ?? globalConfig.project,
    base_url: envConfig.base_url ?? projectConfig.base_url ?? globalConfig.base_url ?? DEFAULT_BASE_URL,
  };
}

export function resolveCredential(config: PlaneConfig): { apiKey: string; baseUrl: string } {
  const envApiKey = process.env.PLANE_API_KEY;
  if (envApiKey) {
    return { apiKey: envApiKey, baseUrl: config.base_url ?? DEFAULT_BASE_URL };
  }

  const creds = loadCredentials();
  const workspaceSlug = config.workspace;
  if (!workspaceSlug) {
    throw new Error("No workspace configured. Run `plane auth login` or set PLANE_WORKSPACE.");
  }

  const workspaceCred = creds.workspaces?.[workspaceSlug];
  if (!workspaceCred) {
    throw new Error(`No credentials found for workspace "${workspaceSlug}". Run \`plane auth login\`.`);
  }

  return {
    apiKey: workspaceCred.api_key,
    baseUrl: workspaceCred.base_url ?? config.base_url ?? DEFAULT_BASE_URL,
  };
}

export function writeProjectConfig(config: PlaneConfig): void {
  writeFileSync(join(process.cwd(), ".plane.toml"), TOML.stringify(config as any), "utf-8");
}

export { GLOBAL_CONFIG_DIR, CREDENTIALS_PATH, DEFAULT_BASE_URL };
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx -e "import { resolveConfig } from './src/config.ts'; console.log(resolveConfig())"`
Expected: Prints `{ workspace: undefined, project: undefined, base_url: 'https://api.plane.so' }`

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config loading with TOML hierarchy and credential management"
```

---

### Task 3: Client Factory

**Files:**
- Create: `src/client.ts`

- [ ] **Step 1: Create src/client.ts**

```typescript
import { PlaneClient } from "@makeplane/plane-node-sdk";
import { resolveConfig, resolveCredential, PlaneConfig } from "./config.js";

export interface ResolvedClient {
  client: PlaneClient;
  workspace: string;
  project?: string;
}

export function getClient(opts?: { project?: string }): ResolvedClient {
  const config = resolveConfig();
  const { apiKey, baseUrl } = resolveCredential(config);

  const client = new PlaneClient({
    apiKey,
    baseUrl,
  });

  const workspace = config.workspace;
  if (!workspace) {
    throw new Error("No workspace configured. Run `plane auth login` or set PLANE_WORKSPACE.");
  }

  return {
    client,
    workspace,
    project: opts?.project ?? config.project,
  };
}

export function requireProject(resolved: ResolvedClient): string {
  if (!resolved.project) {
    throw new Error(
      "No project configured. Use --project flag, set PLANE_PROJECT, or run `plane config`."
    );
  }
  return resolved.project;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx -e "import { getClient } from './src/client.ts'; console.log('ok')"`
Expected: Prints "ok" (will throw at runtime without credentials, but import works)

- [ ] **Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat: add PlaneClient factory with config resolution"
```

---

### Task 4: Output Helpers

**Files:**
- Create: `src/output.ts`

- [ ] **Step 1: Create src/output.ts**

```typescript
import Table from "cli-table3";
import chalk from "chalk";

export interface Column<T> {
  header: string;
  key: keyof T | ((row: T) => string);
  width?: number;
}

export function printTable<T>(rows: T[], columns: Column<T>[]): void {
  const table = new Table({
    head: columns.map((c) => chalk.bold(c.header)),
    wordWrap: true,
    ...(columns.some((c) => c.width) && {
      colWidths: columns.map((c) => c.width ?? null),
    }),
  });

  for (const row of rows) {
    table.push(
      columns.map((col) => {
        if (typeof col.key === "function") return col.key(row);
        const val = row[col.key];
        return val == null ? "" : String(val);
      })
    );
  }

  console.log(table.toString());
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(message: string): void {
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx -e "import { printTable } from './src/output.ts'; printTable([{name:'test'}], [{header:'Name', key:'name'}])"`
Expected: Prints a table with "Name" header and "test" row

- [ ] **Step 3: Commit**

```bash
git add src/output.ts
git commit -m "feat: add output helpers for table and JSON formatting"
```

---

### Task 5: ID Resolution

**Files:**
- Create: `src/resolve-id.ts`

- [ ] **Step 1: Create src/resolve-id.ts**

The SDK has `retrieveByIdentifier(workspaceSlug, identifier)` which accepts identifiers like `PROJ-123` directly. We just need to detect the format and route appropriately.

```typescript
const SEQUENCE_ID_PATTERN = /^[A-Z]+-\d+$/;

export interface ResolvedWorkItem {
  projectId: string;
  workItemId: string;
}

export function isSequenceId(id: string): boolean {
  return SEQUENCE_ID_PATTERN.test(id);
}

export function parseSequenceId(id: string): { identifier: string } {
  if (!SEQUENCE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid sequence ID format: ${id}. Expected format: PROJ-123`);
  }
  return { identifier: id };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx -e "import { isSequenceId } from './src/resolve-id.ts'; console.log(isSequenceId('PROJ-123'), isSequenceId('some-uuid'))"`
Expected: `true false`

- [ ] **Step 3: Commit**

```bash
git add src/resolve-id.ts
git commit -m "feat: add sequence ID detection for work item resolution"
```

---

### Task 6: Auth Commands

**Files:**
- Create: `src/commands/auth/login.ts`
- Create: `src/commands/auth/logout.ts`
- Create: `src/commands/auth/status.ts`
- Create: `src/commands/auth/token.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/auth/login.ts**

```typescript
import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import { PlaneClient } from "@makeplane/plane-node-sdk";
import { loadCredentials, saveCredentials, DEFAULT_BASE_URL } from "../../config.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const loginCommand = new Command("login")
  .description("Authenticate with Plane")
  .option("--key <key>", "API key")
  .option("--workspace <slug>", "Workspace slug")
  .option("--base-url <url>", "Base URL for self-hosted instances")
  .action(async (opts) => {
    try {
      const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
      const apiKey =
        opts.key ?? (await password({ message: "Enter your Plane API key:" }));
      const workspaceSlug =
        opts.workspace ??
        (await input({ message: "Enter your workspace slug:" }));

      // Validate the key by fetching current user
      const client = new PlaneClient({ apiKey, baseUrl });
      const user = await client.users.me();
      console.log(
        chalk.green(`Authenticated as ${user.display_name ?? user.email}`)
      );

      // Store credentials
      const creds = loadCredentials();
      if (!creds.workspaces) creds.workspaces = {};
      creds.workspaces[workspaceSlug] = { api_key: apiKey, base_url: baseUrl };
      if (!creds.default) creds.default = {};
      creds.default.workspace = creds.default.workspace ?? workspaceSlug;
      saveCredentials(creds);

      console.log(
        chalk.green(`Credentials saved for workspace "${workspaceSlug}"`)
      );
    } catch (err: any) {
      printError(err.message ?? "Authentication failed");
    }
  });
```

- [ ] **Step 2: Create src/commands/auth/logout.ts**

```typescript
import { Command } from "commander";
import { loadCredentials, saveCredentials, resolveConfig } from "../../config.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const logoutCommand = new Command("logout")
  .description("Remove stored credentials")
  .argument("[workspace]", "Workspace to log out of (defaults to current)")
  .action(async (workspace) => {
    try {
      const slug = workspace ?? resolveConfig().workspace;
      if (!slug) {
        printError("No workspace specified and no default workspace configured.");
      }

      const creds = loadCredentials();
      if (!creds.workspaces?.[slug]) {
        printError(`No credentials found for workspace "${slug}".`);
      }

      delete creds.workspaces![slug];
      if (creds.default?.workspace === slug) {
        const remaining = Object.keys(creds.workspaces ?? {});
        creds.default.workspace = remaining[0];
      }
      saveCredentials(creds);

      console.log(chalk.green(`Logged out of workspace "${slug}"`));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 3: Create src/commands/auth/status.ts**

```typescript
import { Command } from "commander";
import { getClient } from "../../client.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const statusCommand = new Command("status")
  .description("Show current authentication status")
  .action(async () => {
    try {
      const { client, workspace } = getClient();
      const user = await client.users.me();

      console.log(`${chalk.bold("Workspace:")} ${workspace}`);
      console.log(`${chalk.bold("User:")} ${user.display_name ?? user.email}`);
      console.log(`${chalk.bold("Email:")} ${user.email}`);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 4: Create src/commands/auth/token.ts**

```typescript
import { Command } from "commander";
import { resolveConfig, resolveCredential } from "../../config.js";
import { printError } from "../../output.js";

export const tokenCommand = new Command("token")
  .description("Print the current API key")
  .action(() => {
    try {
      const config = resolveConfig();
      const { apiKey } = resolveCredential(config);
      process.stdout.write(apiKey);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 5: Wire auth commands into src/index.ts**

Replace `src/index.ts` with:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/auth/login.js";
import { logoutCommand } from "./commands/auth/logout.js";
import { statusCommand } from "./commands/auth/status.js";
import { tokenCommand } from "./commands/auth/token.js";

const program = new Command();
program
  .name("plane")
  .description("CLI for Plane.so project tracker")
  .version("0.1.0");

const auth = program.command("auth").description("Manage authentication");
auth.addCommand(loginCommand);
auth.addCommand(logoutCommand);
auth.addCommand(statusCommand);
auth.addCommand(tokenCommand);

program.parse();
```

- [ ] **Step 6: Verify auth help**

Run: `npx tsx src/index.ts auth --help`
Expected: Shows login, logout, status, token subcommands

- [ ] **Step 7: Commit**

```bash
git add src/commands/auth/ src/index.ts
git commit -m "feat: add auth commands (login, logout, status, token)"
```

---

### Task 7: Config Wizard

**Files:**
- Create: `src/commands/config.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/config.ts**

```typescript
import { Command } from "commander";
import { select } from "@inquirer/prompts";
import { PlaneClient } from "@makeplane/plane-node-sdk";
import {
  loadCredentials,
  resolveCredential,
  resolveConfig,
  writeProjectConfig,
} from "../config.js";
import { printError } from "../output.js";
import chalk from "chalk";

export const configCommand = new Command("config")
  .description("Interactive project configuration wizard")
  .action(async () => {
    try {
      const creds = loadCredentials();
      const workspaceSlugs = Object.keys(creds.workspaces ?? {});

      if (workspaceSlugs.length === 0) {
        printError("No workspaces found. Run `plane auth login` first.");
      }

      let workspaceSlug: string;
      if (workspaceSlugs.length === 1) {
        workspaceSlug = workspaceSlugs[0];
        console.log(`Using workspace: ${chalk.bold(workspaceSlug)}`);
      } else {
        workspaceSlug = await select({
          message: "Select workspace:",
          choices: workspaceSlugs.map((s) => ({ value: s, name: s })),
        });
      }

      const config = resolveConfig();
      const { apiKey, baseUrl } = resolveCredential({
        ...config,
        workspace: workspaceSlug,
      });
      const client = new PlaneClient({ apiKey, baseUrl });

      const projectsResponse = await client.projects.list(workspaceSlug);
      const projects = projectsResponse.results;

      if (projects.length === 0) {
        printError("No projects found in this workspace.");
      }

      const projectId = await select({
        message: "Select default project:",
        choices: projects.map((p) => ({
          value: p.identifier ?? p.id,
          name: `${p.identifier ?? p.id} — ${p.name}`,
        })),
      });

      writeProjectConfig({
        workspace: workspaceSlug,
        project: projectId,
      });

      console.log(chalk.green(`Config written to .plane.toml`));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Add config command to src/index.ts**

Add import at top:
```typescript
import { configCommand } from "./commands/config.js";
```

Add after auth block:
```typescript
program.addCommand(configCommand);
```

- [ ] **Step 3: Verify**

Run: `npx tsx src/index.ts config --help`
Expected: Shows "Interactive project configuration wizard"

- [ ] **Step 4: Commit**

```bash
git add src/commands/config.ts src/index.ts
git commit -m "feat: add interactive config wizard"
```

---

### Task 8: Project Commands

**Files:**
- Create: `src/commands/project/list.ts`
- Create: `src/commands/project/view.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/project/list.ts**

```typescript
import { Command } from "commander";
import { getClient } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import type { Project } from "@makeplane/plane-node-sdk";

export const listProjectsCommand = new Command("list")
  .description("List projects in the workspace")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const { client, workspace } = getClient();
      const response = await client.projects.list(workspace);

      if (opts.json) {
        printJson(response.results);
        return;
      }

      printTable(response.results, [
        { header: "Identifier", key: "identifier" },
        { header: "Name", key: "name" },
        { header: "Description", key: (r: Project) => r.description?.slice(0, 50) ?? "" },
        { header: "Members", key: (r: Project) => String(r.total_members) },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Create src/commands/project/view.ts**

```typescript
import { Command } from "commander";
import { getClient } from "../../client.js";
import { printJson, printError } from "../../output.js";
import chalk from "chalk";

export const viewProjectCommand = new Command("view")
  .description("View project details")
  .argument("<id>", "Project ID or identifier")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const { client, workspace } = getClient();
      const project = await client.projects.retrieve(workspace, id);

      if (opts.json) {
        printJson(project);
        return;
      }

      console.log(`${chalk.bold("Name:")} ${project.name}`);
      console.log(`${chalk.bold("Identifier:")} ${project.identifier}`);
      console.log(`${chalk.bold("Description:")} ${project.description || "—"}`);
      console.log(`${chalk.bold("Members:")} ${project.total_members}`);
      console.log(`${chalk.bold("Cycles:")} ${project.total_cycles}`);
      console.log(`${chalk.bold("Modules:")} ${project.total_modules}`);
      console.log(`${chalk.bold("Created:")} ${project.created_at}`);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 3: Wire project commands into src/index.ts**

Add imports:
```typescript
import { listProjectsCommand } from "./commands/project/list.js";
import { viewProjectCommand } from "./commands/project/view.js";
```

Add after config:
```typescript
const project = program.command("project").alias("p").description("Manage projects");
project.addCommand(listProjectsCommand);
project.addCommand(viewProjectCommand);
```

- [ ] **Step 4: Verify**

Run: `npx tsx src/index.ts project --help`
Expected: Shows list and view subcommands

- [ ] **Step 5: Commit**

```bash
git add src/commands/project/ src/index.ts
git commit -m "feat: add project list and view commands"
```

---

### Task 9: State, Label, Member List Commands

**Files:**
- Create: `src/commands/state/list.ts`
- Create: `src/commands/label/list.ts`
- Create: `src/commands/member/list.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/state/list.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import chalk from "chalk";

const GROUP_COLORS: Record<string, (s: string) => string> = {
  backlog: chalk.gray,
  unstarted: chalk.white,
  started: chalk.yellow,
  completed: chalk.green,
  cancelled: chalk.red,
  triage: chalk.magenta,
};

export const listStatesCommand = new Command("list")
  .description("List states for the current project")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = requireProject(resolved);
      const { client, workspace } = resolved;

      const response = await client.states.list(workspace, projectId);

      if (opts.json) {
        printJson(response.results);
        return;
      }

      printTable(response.results, [
        { header: "Name", key: "name" },
        {
          header: "Group",
          key: (r) => {
            const colorFn = GROUP_COLORS[r.group ?? ""] ?? chalk.white;
            return colorFn(r.group ?? "");
          },
        },
        { header: "Color", key: "color" },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Create src/commands/label/list.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";

export const listLabelsCommand = new Command("list")
  .description("List labels for the current project")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = requireProject(resolved);
      const { client, workspace } = resolved;

      const response = await client.labels.list(workspace, projectId);

      if (opts.json) {
        printJson(response.results);
        return;
      }

      printTable(response.results, [
        { header: "Name", key: "name" },
        { header: "Color", key: "color" },
        { header: "Description", key: (r) => r.description ?? "" },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 3: Create src/commands/member/list.ts**

The SDK's `workspace.getMembers()` returns `User[]` (workspace members), and `projects.getMembers()` returns project-level members. Since we're project-scoped, use project members if a project is configured, else workspace members.

```typescript
import { Command } from "commander";
import { getClient } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import type { User } from "@makeplane/plane-node-sdk";

export const listMembersCommand = new Command("list")
  .description("List members")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let members: User[];
      if (resolved.project) {
        members = await client.projects.getMembers(workspace, resolved.project);
      } else {
        members = await client.workspace.getMembers(workspace);
      }

      if (opts.json) {
        printJson(members);
        return;
      }

      printTable(members, [
        { header: "Display Name", key: "display_name" },
        { header: "Email", key: "email" },
        {
          header: "Name",
          key: (r: User) =>
            [r.first_name, r.last_name].filter(Boolean).join(" ") || "",
        },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 4: Wire into src/index.ts**

Add imports:
```typescript
import { listStatesCommand } from "./commands/state/list.js";
import { listLabelsCommand } from "./commands/label/list.js";
import { listMembersCommand } from "./commands/member/list.js";
```

Add commands:
```typescript
const state = program.command("state").alias("s").description("Manage states");
state.addCommand(listStatesCommand);

const label = program.command("label").alias("l").description("Manage labels");
label.addCommand(listLabelsCommand);

const member = program.command("member").alias("m").description("Manage members");
member.addCommand(listMembersCommand);
```

- [ ] **Step 5: Verify**

Run: `npx tsx src/index.ts state --help && npx tsx src/index.ts label --help && npx tsx src/index.ts member --help`
Expected: Each shows "list" subcommand

- [ ] **Step 6: Commit**

```bash
git add src/commands/state/ src/commands/label/ src/commands/member/ src/index.ts
git commit -m "feat: add state, label, and member list commands"
```

---

### Task 10: Work Item List Command

**Files:**
- Create: `src/commands/work-item/list.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/list.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import chalk from "chalk";

const PRIORITY_LABELS: Record<string, string> = {
  urgent: chalk.red("urgent"),
  high: chalk.yellow("high"),
  medium: chalk.blue("medium"),
  low: chalk.gray("low"),
  none: chalk.dim("none"),
};

export const listWorkItemsCommand = new Command("list")
  .description("List work items")
  .option("--project <id>", "Project ID or identifier")
  .option("--state <name>", "Filter by state name")
  .option("--label <name>", "Filter by label name")
  .option("--assignee <name>", "Filter by assignee name")
  .option("--limit <n>", "Max results", "50")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient({ project: opts.project });
      const projectId = requireProject(resolved);
      const { client, workspace } = resolved;

      const response = await client.workItems.list(workspace, projectId, {
        limit: parseInt(opts.limit, 10),
      });

      // Fetch expand data for display
      const expanded = await Promise.all(
        response.results.map((wi) =>
          client.workItems.retrieve(workspace, projectId, wi.id, [
            "state",
            "labels",
            "assignees",
          ])
        )
      );

      if (opts.json) {
        printJson(expanded);
        return;
      }

      // Apply client-side filters
      let filtered = expanded;
      if (opts.state) {
        const stateName = opts.state.toLowerCase();
        filtered = filtered.filter(
          (wi: any) => wi.state?.name?.toLowerCase() === stateName
        );
      }
      if (opts.label) {
        const labelName = opts.label.toLowerCase();
        filtered = filtered.filter((wi: any) =>
          wi.labels?.some(
            (l: any) => l.name?.toLowerCase() === labelName
          )
        );
      }
      if (opts.assignee) {
        const assigneeName = opts.assignee.toLowerCase();
        filtered = filtered.filter((wi: any) =>
          wi.assignees?.some(
            (a: any) =>
              a.display_name?.toLowerCase().includes(assigneeName) ||
              a.email?.toLowerCase().includes(assigneeName)
          )
        );
      }

      printTable(filtered, [
        {
          header: "ID",
          key: (r: any) => `${r.project?.identifier ?? "?"}-${r.sequence_id}`,
        },
        { header: "Title", key: "name" },
        { header: "State", key: (r: any) => r.state?.name ?? "" },
        {
          header: "Priority",
          key: (r: any) => PRIORITY_LABELS[r.priority ?? "none"] ?? r.priority ?? "",
        },
        {
          header: "Assignees",
          key: (r: any) =>
            r.assignees?.map((a: any) => a.display_name ?? a.email).join(", ") ?? "",
        },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Start wiring work-item commands in src/index.ts**

Add import:
```typescript
import { listWorkItemsCommand } from "./commands/work-item/list.js";
```

Add command group:
```typescript
const workItem = program.command("work-item").alias("wi").description("Manage work items");
workItem.addCommand(listWorkItemsCommand);
```

- [ ] **Step 3: Verify**

Run: `npx tsx src/index.ts work-item --help`
Expected: Shows "list" subcommand

- [ ] **Step 4: Commit**

```bash
git add src/commands/work-item/list.ts src/index.ts
git commit -m "feat: add work-item list command with filtering"
```

---

### Task 11: Work Item View Command

**Files:**
- Create: `src/commands/work-item/view.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/view.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import { isSequenceId } from "../../resolve-id.js";
import chalk from "chalk";
import { Marked } from "marked";
import markedTerminal from "marked-terminal";

const marked = new Marked(markedTerminal() as any);

export const viewWorkItemCommand = new Command("view")
  .description("View work item details")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let workItem: any;

      if (isSequenceId(id)) {
        workItem = await client.workItems.retrieveByIdentifier(
          workspace,
          id,
          ["state", "labels", "assignees", "project"]
        );
      } else {
        const projectId = requireProject(resolved);
        workItem = await client.workItems.retrieve(
          workspace,
          projectId,
          id,
          ["state", "labels", "assignees", "project"]
        );
      }

      if (opts.json) {
        printJson(workItem);
        return;
      }

      const identifier = `${workItem.project?.identifier ?? "?"}-${workItem.sequence_id}`;
      console.log(chalk.bold.underline(identifier) + " " + chalk.bold(workItem.name));
      console.log();
      console.log(`${chalk.bold("State:")} ${workItem.state?.name ?? "—"}`);
      console.log(`${chalk.bold("Priority:")} ${workItem.priority ?? "none"}`);
      console.log(
        `${chalk.bold("Assignees:")} ${
          workItem.assignees?.map((a: any) => a.display_name ?? a.email).join(", ") || "—"
        }`
      );
      console.log(
        `${chalk.bold("Labels:")} ${
          workItem.labels?.map((l: any) => l.name).join(", ") || "—"
        }`
      );
      if (workItem.start_date) console.log(`${chalk.bold("Start:")} ${workItem.start_date}`);
      if (workItem.target_date) console.log(`${chalk.bold("Due:")} ${workItem.target_date}`);
      console.log(`${chalk.bold("Created:")} ${workItem.created_at}`);

      if (workItem.description_html) {
        console.log();
        console.log(chalk.bold("Description:"));
        console.log(marked.parse(workItem.description_html));
      }
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Add to src/index.ts**

Add import:
```typescript
import { viewWorkItemCommand } from "./commands/work-item/view.js";
```

Add after `listWorkItemsCommand`:
```typescript
workItem.addCommand(viewWorkItemCommand);
```

- [ ] **Step 3: Verify**

Run: `npx tsx src/index.ts work-item view --help`
Expected: Shows `<id>` argument and `--json` option

- [ ] **Step 4: Commit**

```bash
git add src/commands/work-item/view.ts src/index.ts
git commit -m "feat: add work-item view command with markdown rendering"
```

---

### Task 12: Work Item Create Command

**Files:**
- Create: `src/commands/work-item/create.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/create.ts**

```typescript
import { Command } from "commander";
import { input, select, checkbox } from "@inquirer/prompts";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import chalk from "chalk";
import type { CreateWorkItem, PriorityEnum } from "@makeplane/plane-node-sdk";

const PRIORITIES: PriorityEnum[] = ["urgent", "high", "medium", "low", "none"];

export const createWorkItemCommand = new Command("create")
  .description("Create a new work item")
  .option("-t, --title <title>", "Title")
  .option("-d, --description <text>", "Description (HTML)")
  .option("-s, --state <state>", "State name")
  .option("-p, --priority <priority>", "Priority (urgent/high/medium/low/none)")
  .option("-a, --assignee <name>", "Assignee display name or email")
  .option("-l, --label <name...>", "Label names")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = requireProject(resolved);
      const { client, workspace } = resolved;

      const isInteractive = !opts.title;
      let title = opts.title;
      let stateId: string | undefined;
      let priority: PriorityEnum | undefined = opts.priority;
      let assigneeIds: string[] | undefined;
      let labelIds: string[] | undefined;
      let description: string | undefined = opts.description;

      if (isInteractive) {
        title = await input({ message: "Title:" });

        // Fetch states for selection
        const statesResp = await client.states.list(workspace, projectId);
        const states = statesResp.results;
        if (states.length > 0) {
          stateId = await select({
            message: "State:",
            choices: states.map((s) => ({ value: s.id, name: `${s.name} (${s.group})` })),
          });
        }

        priority = await select({
          message: "Priority:",
          choices: PRIORITIES.map((p) => ({ value: p, name: p })),
          default: "none",
        });

        // Fetch members for assignee selection
        const members = await client.projects.getMembers(workspace, projectId);
        if (members.length > 0) {
          const assigneeId = await select({
            message: "Assignee:",
            choices: [
              { value: "", name: "None" },
              ...members.map((m) => ({
                value: m.id!,
                name: m.display_name ?? m.email ?? m.id!,
              })),
            ],
          });
          if (assigneeId) assigneeIds = [assigneeId];
        }

        // Fetch labels for selection
        const labelsResp = await client.labels.list(workspace, projectId);
        const labels = labelsResp.results;
        if (labels.length > 0) {
          labelIds = await checkbox({
            message: "Labels:",
            choices: labels.map((l) => ({ value: l.id, name: l.name })),
          });
          if (labelIds.length === 0) labelIds = undefined;
        }

        description = await input({ message: "Description (HTML or plain text):", default: "" });
        if (!description) description = undefined;
      } else {
        // Non-interactive: resolve names to IDs
        if (opts.state) {
          const statesResp = await client.states.list(workspace, projectId);
          const match = statesResp.results.find(
            (s) => s.name.toLowerCase() === opts.state.toLowerCase()
          );
          if (!match) printError(`State "${opts.state}" not found.`);
          stateId = match!.id;
        }

        if (opts.assignee) {
          const members = await client.projects.getMembers(workspace, projectId);
          const match = members.find(
            (m) =>
              m.display_name?.toLowerCase() === opts.assignee.toLowerCase() ||
              m.email?.toLowerCase() === opts.assignee.toLowerCase()
          );
          if (!match) printError(`Assignee "${opts.assignee}" not found.`);
          assigneeIds = [match!.id!];
        }

        if (opts.label) {
          const labelsResp = await client.labels.list(workspace, projectId);
          labelIds = [];
          for (const name of opts.label) {
            const match = labelsResp.results.find(
              (l) => l.name.toLowerCase() === name.toLowerCase()
            );
            if (!match) printError(`Label "${name}" not found.`);
            labelIds.push(match!.id);
          }
        }
      }

      const payload: CreateWorkItem = {
        name: title,
        ...(description && { description_html: `<p>${description}</p>` }),
        ...(stateId && { state: stateId }),
        ...(priority && priority !== "none" && { priority }),
        ...(assigneeIds && { assignees: assigneeIds }),
        ...(labelIds && { labels: labelIds }),
      };

      const created = await client.workItems.create(workspace, projectId, payload);

      if (opts.json) {
        printJson(created);
        return;
      }

      console.log(chalk.green(`Created work item: ${created.sequence_id} — ${created.name}`));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Add to src/index.ts**

Add import:
```typescript
import { createWorkItemCommand } from "./commands/work-item/create.js";
```

Add:
```typescript
workItem.addCommand(createWorkItemCommand);
```

- [ ] **Step 3: Verify**

Run: `npx tsx src/index.ts work-item create --help`
Expected: Shows all options (--title, --description, --state, --priority, --assignee, --label, --json)

- [ ] **Step 4: Commit**

```bash
git add src/commands/work-item/create.ts src/index.ts
git commit -m "feat: add work-item create with interactive and flag modes"
```

---

### Task 13: Work Item Update Command

**Files:**
- Create: `src/commands/work-item/update.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/update.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import { isSequenceId } from "../../resolve-id.js";
import chalk from "chalk";
import type { UpdateWorkItem, PriorityEnum } from "@makeplane/plane-node-sdk";

export const updateWorkItemCommand = new Command("update")
  .description("Update a work item")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("-t, --title <title>", "New title")
  .option("-s, --state <state>", "State name")
  .option("-p, --priority <priority>", "Priority (urgent/high/medium/low/none)")
  .option("-a, --assignee <name>", "Assignee display name or email")
  .option("-l, --label <name...>", "Label names")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      // Resolve work item to get projectId
      let projectId: string;
      let workItemId: string;

      if (isSequenceId(id)) {
        const wi = await client.workItems.retrieveByIdentifier(workspace, id);
        projectId = wi.project;
        workItemId = wi.id;
      } else {
        projectId = requireProject(resolved);
        workItemId = id;
      }

      const payload: UpdateWorkItem = {};
      if (opts.title) payload.name = opts.title;
      if (opts.priority) payload.priority = opts.priority as PriorityEnum;

      if (opts.state) {
        const statesResp = await client.states.list(workspace, projectId);
        const match = statesResp.results.find(
          (s) => s.name.toLowerCase() === opts.state.toLowerCase()
        );
        if (!match) printError(`State "${opts.state}" not found.`);
        payload.state = match!.id;
      }

      if (opts.assignee) {
        const members = await client.projects.getMembers(workspace, projectId);
        const match = members.find(
          (m) =>
            m.display_name?.toLowerCase() === opts.assignee.toLowerCase() ||
            m.email?.toLowerCase() === opts.assignee.toLowerCase()
        );
        if (!match) printError(`Assignee "${opts.assignee}" not found.`);
        payload.assignees = [match!.id!];
      }

      if (opts.label) {
        const labelsResp = await client.labels.list(workspace, projectId);
        const labelIds: string[] = [];
        for (const name of opts.label) {
          const match = labelsResp.results.find(
            (l) => l.name.toLowerCase() === name.toLowerCase()
          );
          if (!match) printError(`Label "${name}" not found.`);
          labelIds.push(match!.id);
        }
        payload.labels = labelIds;
      }

      if (Object.keys(payload).length === 0) {
        printError("No updates specified. Use --title, --state, --priority, --assignee, or --label.");
      }

      const updated = await client.workItems.update(workspace, projectId, workItemId, payload);

      if (opts.json) {
        printJson(updated);
        return;
      }

      console.log(chalk.green(`Updated work item: ${updated.sequence_id} — ${updated.name}`));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Add to src/index.ts**

Add import:
```typescript
import { updateWorkItemCommand } from "./commands/work-item/update.js";
```

Add:
```typescript
workItem.addCommand(updateWorkItemCommand);
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/work-item/update.ts src/index.ts
git commit -m "feat: add work-item update command"
```

---

### Task 14: Work Item Delete Command

**Files:**
- Create: `src/commands/work-item/delete.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/delete.ts**

```typescript
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { getClient, requireProject } from "../../client.js";
import { printError } from "../../output.js";
import { isSequenceId } from "../../resolve-id.js";
import chalk from "chalk";

export const deleteWorkItemCommand = new Command("delete")
  .description("Delete a work item")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let projectId: string;
      let workItemId: string;
      let displayName: string = id;

      if (isSequenceId(id)) {
        const wi = await client.workItems.retrieveByIdentifier(workspace, id);
        projectId = wi.project;
        workItemId = wi.id;
        displayName = `${id} — ${wi.name}`;
      } else {
        projectId = requireProject(resolved);
        workItemId = id;
      }

      if (!opts.confirm) {
        const yes = await confirm({
          message: `Delete work item "${displayName}"?`,
          default: false,
        });
        if (!yes) {
          console.log("Cancelled.");
          return;
        }
      }

      await client.workItems.delete(workspace, projectId, workItemId);
      console.log(chalk.green(`Deleted work item: ${displayName}`));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Add to src/index.ts**

Add import:
```typescript
import { deleteWorkItemCommand } from "./commands/work-item/delete.js";
```

Add:
```typescript
workItem.addCommand(deleteWorkItemCommand);
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/work-item/delete.ts src/index.ts
git commit -m "feat: add work-item delete command with confirmation"
```

---

### Task 15: Work Item Comment Commands

**Files:**
- Create: `src/commands/work-item/comment/list.ts`
- Create: `src/commands/work-item/comment/add.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/work-item/comment/list.ts**

```typescript
import { Command } from "commander";
import { getClient, requireProject } from "../../../client.js";
import { printTable, printJson, printError } from "../../../output.js";
import { isSequenceId } from "../../../resolve-id.js";

export const listCommentsCommand = new Command("list")
  .description("List comments on a work item")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let projectId: string;
      let workItemId: string;

      if (isSequenceId(id)) {
        const wi = await client.workItems.retrieveByIdentifier(workspace, id);
        projectId = wi.project;
        workItemId = wi.id;
      } else {
        projectId = requireProject(resolved);
        workItemId = id;
      }

      const response = await client.workItems.comments.list(
        workspace,
        projectId,
        workItemId
      );

      if (opts.json) {
        printJson(response.results);
        return;
      }

      printTable(response.results, [
        { header: "ID", key: (r) => r.id.slice(0, 8) },
        { header: "Comment", key: (r) => r.comment_stripped?.slice(0, 80) ?? r.comment_html?.slice(0, 80) ?? "" },
        { header: "Created", key: (r) => r.created_at ?? "" },
        { header: "By", key: (r) => r.actor ?? r.created_by ?? "" },
      ]);
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 2: Create src/commands/work-item/comment/add.ts**

```typescript
import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { getClient, requireProject } from "../../../client.js";
import { printJson, printError } from "../../../output.js";
import { isSequenceId } from "../../../resolve-id.js";
import chalk from "chalk";

export const addCommentCommand = new Command("add")
  .description("Add a comment to a work item")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("--body <text>", "Comment body")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let projectId: string;
      let workItemId: string;

      if (isSequenceId(id)) {
        const wi = await client.workItems.retrieveByIdentifier(workspace, id);
        projectId = wi.project;
        workItemId = wi.id;
      } else {
        projectId = requireProject(resolved);
        workItemId = id;
      }

      const body = opts.body ?? (await input({ message: "Comment:" }));
      if (!body) {
        printError("Comment body is required.");
      }

      const comment = await client.workItems.comments.create(
        workspace,
        projectId,
        workItemId,
        { comment_html: `<p>${body}</p>` }
      );

      if (opts.json) {
        printJson(comment);
        return;
      }

      console.log(chalk.green("Comment added."));
    } catch (err: any) {
      printError(err.message);
    }
  });
```

- [ ] **Step 3: Wire comment commands into src/index.ts**

Add imports:
```typescript
import { listCommentsCommand } from "./commands/work-item/comment/list.js";
import { addCommentCommand } from "./commands/work-item/comment/add.js";
```

Add after work-item subcommands:
```typescript
const comment = workItem.command("comment").description("Manage work item comments");
comment.addCommand(listCommentsCommand);
comment.addCommand(addCommentCommand);
```

- [ ] **Step 4: Verify**

Run: `npx tsx src/index.ts work-item comment --help`
Expected: Shows list and add subcommands

- [ ] **Step 5: Commit**

```bash
git add src/commands/work-item/comment/ src/index.ts
git commit -m "feat: add work-item comment list and add commands"
```

---

### Task 16: Final Integration & Manual Test

**Files:**
- Modify: `src/index.ts` (final review)

- [ ] **Step 1: Verify final src/index.ts has all commands wired**

The complete `src/index.ts` should look like:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/auth/login.js";
import { logoutCommand } from "./commands/auth/logout.js";
import { statusCommand } from "./commands/auth/status.js";
import { tokenCommand } from "./commands/auth/token.js";
import { configCommand } from "./commands/config.js";
import { listProjectsCommand } from "./commands/project/list.js";
import { viewProjectCommand } from "./commands/project/view.js";
import { listStatesCommand } from "./commands/state/list.js";
import { listLabelsCommand } from "./commands/label/list.js";
import { listMembersCommand } from "./commands/member/list.js";
import { listWorkItemsCommand } from "./commands/work-item/list.js";
import { viewWorkItemCommand } from "./commands/work-item/view.js";
import { createWorkItemCommand } from "./commands/work-item/create.js";
import { updateWorkItemCommand } from "./commands/work-item/update.js";
import { deleteWorkItemCommand } from "./commands/work-item/delete.js";
import { listCommentsCommand } from "./commands/work-item/comment/list.js";
import { addCommentCommand } from "./commands/work-item/comment/add.js";

const program = new Command();
program
  .name("plane")
  .description("CLI for Plane.so project tracker")
  .version("0.1.0");

// Auth
const auth = program.command("auth").description("Manage authentication");
auth.addCommand(loginCommand);
auth.addCommand(logoutCommand);
auth.addCommand(statusCommand);
auth.addCommand(tokenCommand);

// Config
program.addCommand(configCommand);

// Projects
const project = program.command("project").alias("p").description("Manage projects");
project.addCommand(listProjectsCommand);
project.addCommand(viewProjectCommand);

// States
const state = program.command("state").alias("s").description("Manage states");
state.addCommand(listStatesCommand);

// Labels
const label = program.command("label").alias("l").description("Manage labels");
label.addCommand(listLabelsCommand);

// Members
const member = program.command("member").alias("m").description("Manage members");
member.addCommand(listMembersCommand);

// Work Items
const workItem = program.command("work-item").alias("wi").description("Manage work items");
workItem.addCommand(listWorkItemsCommand);
workItem.addCommand(viewWorkItemCommand);
workItem.addCommand(createWorkItemCommand);
workItem.addCommand(updateWorkItemCommand);
workItem.addCommand(deleteWorkItemCommand);

const comment = workItem.command("comment").description("Manage work item comments");
comment.addCommand(listCommentsCommand);
comment.addCommand(addCommentCommand);

program.parse();
```

- [ ] **Step 2: Verify full help tree**

Run: `npx tsx src/index.ts --help`
Expected: Shows auth, config, project, state, label, member, work-item commands

Run: `npx tsx src/index.ts work-item --help`
Expected: Shows list, view, create, update, delete, comment subcommands

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `dist/` directory created with compiled JS

- [ ] **Step 5: Test with real credentials (manual)**

```bash
# Login
npx tsx src/index.ts auth login

# Check status
npx tsx src/index.ts auth status

# List projects
npx tsx src/index.ts project list

# Set up config
npx tsx src/index.ts config

# List work items
npx tsx src/index.ts wi list

# View a specific work item
npx tsx src/index.ts wi view PROJ-123

# Create a work item
npx tsx src/index.ts wi create -t "Test from CLI" -p medium

# List comments
npx tsx src/index.ts wi comment list PROJ-123
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete plane-cli phase 1 — all commands wired and working"
```
