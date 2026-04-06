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
        projectId = await requireProject(resolved);
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
      printError(err);
    }
  });
