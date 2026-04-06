import { PlaneClient } from "@makeplane/plane-node-sdk";
import { resolveConfig, resolveCredential } from "./config.js";
import { resolveProjectId } from "./resolve-id.js";

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

export async function requireProject(resolved: ResolvedClient): Promise<string> {
  if (!resolved.project) {
    throw new Error(
      "No project configured. Use --project flag, set PLANE_PROJECT, or run `plane config`."
    );
  }
  return resolveProjectId(resolved.client, resolved.workspace, resolved.project);
}
