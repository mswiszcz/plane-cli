import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import chalk from "chalk";

const PRIORITY_LABELS: Record<string, string> = {
  urgent: chalk.red("urgent"),
  high: chalk.yellow("high"),
  medium: chalk.blue("medium"),
  low: chalk.gray("low"),
  none: chalk.dim("none"),
};

export const listWorkItemsCommand = new Command("list")
  .description("List work items")
  .option("--project <id>", "Project ID or identifier")
  .option("--state <name>", "Filter by state name")
  .option("--label <name>", "Filter by label name")
  .option("--assignee <name>", "Filter by assignee name")
  .option("--limit <n>", "Max results", "50")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient({ project: opts.project });
      const projectId = await requireProject(resolved);
      const { client, workspace } = resolved;

      const response = await client.workItems.list(workspace, projectId, {
        per_page: parseInt(opts.limit, 10),
        expand: "state,labels,assignees,project",
      } as any);
      const expanded = response.results;

      if (opts.json) {
        printJson(expanded);
        return;
      }

      // Apply client-side filters
      let filtered = expanded;
      if (opts.state) {
        const stateName = opts.state.toLowerCase();
        filtered = filtered.filter(
          (wi: any) => wi.state?.name?.toLowerCase() === stateName
        );
      }
      if (opts.label) {
        const labelName = opts.label.toLowerCase();
        filtered = filtered.filter((wi: any) =>
          wi.labels?.some(
            (l: any) => l.name?.toLowerCase() === labelName
          )
        );
      }
      if (opts.assignee) {
        const assigneeName = opts.assignee.toLowerCase();
        filtered = filtered.filter((wi: any) =>
          wi.assignees?.some(
            (a: any) =>
              a.display_name?.toLowerCase().includes(assigneeName) ||
              a.email?.toLowerCase().includes(assigneeName)
          )
        );
      }

      printTable(filtered, [
        {
          header: "ID",
          key: (r: any) => `${r.project?.identifier ?? "?"}-${r.sequence_id}`,
        },
        { header: "Title", key: "name" },
        { header: "State", key: (r: any) => r.state?.name ?? "" },
        {
          header: "Priority",
          key: (r: any) => PRIORITY_LABELS[r.priority ?? "none"] ?? r.priority ?? "",
        },
        {
          header: "Assignees",
          key: (r: any) =>
            r.assignees?.map((a: any) => a.display_name ?? a.email).join(", ") ?? "",
        },
      ]);
    } catch (err: any) {
      printError(err);
    }
  });
