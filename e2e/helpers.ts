import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const CLI_PATH = resolve(import.meta.dirname, "..", "src", "index.ts");

// Load e2e/.env if present
const envPath = resolve(import.meta.dirname, ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}. Copy e2e/.env.example to e2e/.env and fill in values.`);
  return value;
}

export const API_KEY = requireEnv("PLANE_TEST_API_KEY");
export const WORKSPACE = requireEnv("PLANE_TEST_WORKSPACE");
export const BASE_URL = requireEnv("PLANE_TEST_BASE_URL");
export const TEST_PROJECT_ID = requireEnv("PLANE_TEST_PROJECT_ID");
export const TEST_PROJECT_IDENTIFIER = requireEnv("PLANE_TEST_PROJECT_IDENTIFIER");

export function runCli(args: string[], opts?: { project?: string }): string {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PLANE_API_KEY: API_KEY,
    PLANE_WORKSPACE: WORKSPACE,
    PLANE_BASE_URL: BASE_URL,
  };
  if (opts?.project) {
    env.PLANE_PROJECT = opts.project;
  }

  return execFileSync("npx", ["tsx", CLI_PATH, ...args], {
    encoding: "utf-8",
    env,
    timeout: 30_000,
  });
}

export function runCliJson<T = any>(args: string[], opts?: { project?: string }): T {
  const output = runCli([...args, "--json"], opts);
  return JSON.parse(output) as T;
}
