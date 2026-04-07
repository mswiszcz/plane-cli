import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import { isSequenceId, isPlainNumber, isUuid } from "../../resolve-id.js";
import chalk from "chalk";

const EXPAND = ["state", "labels", "assignees", "project"] as const;

export const viewWorkItemCommand = new Command("view")
  .description("View work item details")
  .argument("<id>", "Work item ID (17, PROJ-17, or UUID)")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let workItem: any;

      if (isSequenceId(id)) {
        // PROJ-17 format
        workItem = await client.workItems.retrieveByIdentifier(workspace, id, [...EXPAND]);
      } else if (isPlainNumber(id)) {
        // Bare number — prefix with project identifier
        const projectId = await requireProject(resolved);
        const projects = await client.projects.list(workspace);
        const project = projects.results.find((p: any) => p.id === projectId);
        if (!project?.identifier) {
          throw new Error("Could not resolve project identifier for sequence ID lookup.");
        }
        workItem = await client.workItems.retrieveByIdentifier(
          workspace,
          `${project.identifier}-${id}`,
          [...EXPAND]
        );
      } else if (isUuid(id)) {
        // UUID
        const projectId = await requireProject(resolved);
        workItem = await client.workItems.retrieve(workspace, projectId, id, [...EXPAND]);
      } else {
        throw new Error(`Invalid work item ID: "${id}". Use a number (17), sequence ID (PROJ-17), or UUID.`);
      }

      if (opts.json) {
        printJson(workItem);
        return;
      }

      const identifier = `${workItem.project?.identifier ?? "?"}-${workItem.sequence_id}`;
      console.log(chalk.bold.underline(identifier) + " " + chalk.bold(workItem.name));
      console.log();
      console.log(`${chalk.bold("State:")} ${workItem.state?.name ?? "—"}`);
      console.log(`${chalk.bold("Priority:")} ${workItem.priority ?? "none"}`);
      console.log(
        `${chalk.bold("Assignees:")} ${
          workItem.assignees?.map((a: any) => a.display_name ?? a.email).join(", ") || "—"
        }`
      );
      console.log(
        `${chalk.bold("Labels:")} ${
          workItem.labels?.map((l: any) => l.name).join(", ") || "—"
        }`
      );
      if (workItem.start_date) console.log(`${chalk.bold("Start:")} ${workItem.start_date}`);
      if (workItem.target_date) console.log(`${chalk.bold("Due:")} ${workItem.target_date}`);
      console.log(`${chalk.bold("Created:")} ${workItem.created_at}`);

      if (workItem.description_html) {
        console.log();
        console.log(chalk.bold("Description:"));
        const text = workItem.description_html.replace(/<[^>]+>/g, "").trim();
        console.log(text);
      }
    } catch (err: any) {
      printError(err);
    }
  });
