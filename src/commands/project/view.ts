import { Command } from "commander";
import { getClient } from "../../client.js";
import { printJson, printError } from "../../output.js";
import { resolveProjectId } from "../../resolve-id.js";
import chalk from "chalk";

export const viewProjectCommand = new Command("view")
  .description("View project details")
  .argument("<id>", "Project ID or identifier")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const { client, workspace } = getClient();
      const projectId = await resolveProjectId(client, workspace, id);
      const project = await client.projects.retrieve(workspace, projectId);

      if (opts.json) {
        printJson(project);
        return;
      }

      console.log(`${chalk.bold("Name:")} ${project.name}`);
      console.log(`${chalk.bold("Identifier:")} ${project.identifier}`);
      console.log(`${chalk.bold("Description:")} ${project.description || "—"}`);
      console.log(`${chalk.bold("Members:")} ${project.total_members ?? ""}`);
      console.log(`${chalk.bold("Cycles:")} ${project.total_cycles}`);
      console.log(`${chalk.bold("Modules:")} ${project.total_modules}`);
      console.log(`${chalk.bold("Created:")} ${project.created_at}`);
    } catch (err: any) {
      printError(err);
    }
  });
