import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import chalk from "chalk";

const GROUP_COLORS: Record<string, (s: string) => string> = {
  backlog: chalk.gray,
  unstarted: chalk.white,
  started: chalk.yellow,
  completed: chalk.green,
  cancelled: chalk.red,
  triage: chalk.magenta,
};

export const listStatesCommand = new Command("list")
  .description("List states for the current project")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = await requireProject(resolved);
      const { client, workspace } = resolved;

      const response = await client.states.list(workspace, projectId);

      if (opts.json) {
        printJson(response.results);
        return;
      }

      printTable(response.results, [
        { header: "Name", key: "name" },
        {
          header: "Group",
          key: (r) => {
            const colorFn = GROUP_COLORS[r.group ?? ""] ?? chalk.white;
            return colorFn(r.group ?? "");
          },
        },
        { header: "Color", key: "color" },
      ]);
    } catch (err: any) {
      printError(err);
    }
  });
