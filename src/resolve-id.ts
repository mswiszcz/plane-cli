import type { PlaneClient } from "@makeplane/plane-node-sdk";

const SEQUENCE_ID_PATTERN = /^[A-Z]+-\d+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedWorkItem {
  projectId: string;
  workItemId: string;
}

export function isSequenceId(id: string): boolean {
  return SEQUENCE_ID_PATTERN.test(id);
}

export function isPlainNumber(id: string): boolean {
  return /^\d+$/.test(id);
}

export function isUuid(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function parseSequenceId(id: string): { identifier: string } {
  if (!SEQUENCE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid sequence ID format: ${id}. Expected format: PROJ-123`);
  }
  return { identifier: id };
}

export async function resolveProjectId(client: PlaneClient, workspace: string, idOrIdentifier: string): Promise<string> {
  if (isUuid(idOrIdentifier)) return idOrIdentifier;

  // Treat as project identifier — look up from project list
  const response = await client.projects.list(workspace);
  const match = response.results.find(
    (p) => p.identifier?.toUpperCase() === idOrIdentifier.toUpperCase() || p.name.toLowerCase() === idOrIdentifier.toLowerCase()
  );
  if (!match) {
    throw new Error(`Project "${idOrIdentifier}" not found. Use a UUID or project identifier (e.g. MYPROJ).`);
  }
  return match.id;
}
