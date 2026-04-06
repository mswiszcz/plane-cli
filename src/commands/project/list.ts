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
        { header: "Members", key: (r: Project) => r.total_members != null ? String(r.total_members) : "" },
      ]);
    } catch (err: any) {
      printError(err);
    }
  });
