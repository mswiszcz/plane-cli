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
        projectId = await requireProject(resolved);
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
      printError(err);
    }
  });
