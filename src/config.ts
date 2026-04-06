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
  const creds = loadCredentials();
  const defaultWorkspace = creds.default?.workspace;

  return {
    workspace: envConfig.workspace ?? projectConfig.workspace ?? globalConfig.workspace ?? defaultWorkspace,
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
