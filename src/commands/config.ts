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
import { resolveProjectId } from "../resolve-id.js";
import chalk from "chalk";

export const configCommand = new Command("config")
  .description("Project configuration (interactive or via flags)")
  .option("-w, --workspace <slug>", "Workspace slug")
  .option("-p, --project <identifier>", "Project identifier or UUID")
  .action(async (opts) => {
    try {
      const creds = loadCredentials();
      const workspaceSlugs = Object.keys(creds.workspaces ?? {});

      if (workspaceSlugs.length === 0) {
        printError("No workspaces found. Run `plane auth login` first.");
      }

      let workspaceSlug: string;
      if (opts.workspace) {
        if (!workspaceSlugs.includes(opts.workspace)) {
          printError(
            `Workspace "${opts.workspace}" not found in credentials. Available: ${workspaceSlugs.join(", ")}`,
          );
        }
        workspaceSlug = opts.workspace;
      } else if (workspaceSlugs.length === 1) {
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

      let projectId: string;
      if (opts.project) {
        projectId = await resolveProjectId(
          client,
          workspaceSlug,
          opts.project,
        );
      } else {
        const projectsResponse = await client.projects.list(workspaceSlug);
        const projects = projectsResponse.results;

        if (projects.length === 0) {
          printError("No projects found in this workspace.");
        }

        projectId = await select({
          message: "Select default project:",
          choices: projects.map((p) => ({
            value: p.id,
            name: `${p.identifier ?? p.id} — ${p.name}`,
          })),
        });
      }

      writeProjectConfig({
        workspace: workspaceSlug,
        project: projectId,
      });

      console.log(chalk.green(`Config written to .plane.toml`));
    } catch (err: any) {
      printError(err);
    }
  });
