import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";

export const listLabelsCommand = new Command("list")
  .description("List labels for the current project")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = await requireProject(resolved);
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
      printError(err);
    }
  });
