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
        projectId = await requireProject(resolved);
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
      printError(err);
    }
  });
