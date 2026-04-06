import { Command } from "commander";
import { input, select, checkbox } from "@inquirer/prompts";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import chalk from "chalk";
import type { CreateWorkItem, PriorityEnum } from "@makeplane/plane-node-sdk";

const PRIORITIES: PriorityEnum[] = ["urgent", "high", "medium", "low", "none"];

export const createWorkItemCommand = new Command("create")
  .description("Create a new work item")
  .option("-t, --title <title>", "Title")
  .option("-d, --description <text>", "Description (HTML)")
  .option("-s, --state <state>", "State name")
  .option("-p, --priority <priority>", "Priority (urgent/high/medium/low/none)")
  .option("-a, --assignee <name>", "Assignee display name or email")
  .option("-l, --label <name...>", "Label names")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const projectId = await requireProject(resolved);
      const { client, workspace } = resolved;

      const isInteractive = !opts.title;
      let title = opts.title;
      let stateId: string | undefined;
      let priority: PriorityEnum | undefined = opts.priority;
      let assigneeIds: string[] | undefined;
      let labelIds: string[] | undefined;
      let description: string | undefined = opts.description;

      if (isInteractive) {
        title = await input({ message: "Title:" });

        // Fetch states for selection
        const statesResp = await client.states.list(workspace, projectId);
        const states = statesResp.results;
        if (states.length > 0) {
          stateId = await select({
            message: "State:",
            choices: states.map((s) => ({ value: s.id, name: `${s.name} (${s.group})` })),
          });
        }

        priority = await select({
          message: "Priority:",
          choices: PRIORITIES.map((p) => ({ value: p, name: p })),
          default: "none",
        });

        // Fetch members for assignee selection
        const members = await client.projects.getMembers(workspace, projectId);
        if (members.length > 0) {
          const assigneeId = await select({
            message: "Assignee:",
            choices: [
              { value: "", name: "None" },
              ...members.map((m) => ({
                value: m.id!,
                name: m.display_name ?? m.email ?? m.id!,
              })),
            ],
          });
          if (assigneeId) assigneeIds = [assigneeId];
        }

        // Fetch labels for selection
        const labelsResp = await client.labels.list(workspace, projectId);
        const labels = labelsResp.results;
        if (labels.length > 0) {
          labelIds = await checkbox({
            message: "Labels:",
            choices: labels.map((l) => ({ value: l.id, name: l.name })),
          });
          if (labelIds.length === 0) labelIds = undefined;
        }

        description = await input({ message: "Description (HTML or plain text):", default: "" });
        if (!description) description = undefined;
      } else {
        // Non-interactive: resolve names to IDs
        if (opts.state) {
          const statesResp = await client.states.list(workspace, projectId);
          const match = statesResp.results.find(
            (s) => s.name.toLowerCase() === opts.state.toLowerCase()
          );
          if (!match) printError(`State "${opts.state}" not found.`);
          stateId = match!.id;
        }

        if (opts.assignee) {
          const members = await client.projects.getMembers(workspace, projectId);
          const match = members.find(
            (m) =>
              m.display_name?.toLowerCase() === opts.assignee.toLowerCase() ||
              m.email?.toLowerCase() === opts.assignee.toLowerCase()
          );
          if (!match) printError(`Assignee "${opts.assignee}" not found.`);
          assigneeIds = [match!.id!];
        }

        if (opts.label) {
          const labelsResp = await client.labels.list(workspace, projectId);
          labelIds = [];
          for (const name of opts.label) {
            const match = labelsResp.results.find(
              (l) => l.name.toLowerCase() === name.toLowerCase()
            );
            if (!match) printError(`Label "${name}" not found.`);
            labelIds.push(match!.id);
          }
        }
      }

      const payload: CreateWorkItem = {
        name: title,
        ...(description && { description_html: `<p>${description}</p>` }),
        ...(stateId && { state: stateId }),
        ...(priority && priority !== "none" && { priority }),
        ...(assigneeIds && { assignees: assigneeIds }),
        ...(labelIds && { labels: labelIds }),
      };

      const created = await client.workItems.create(workspace, projectId, payload);

      if (opts.json) {
        printJson(created);
        return;
      }

      console.log(chalk.green(`Created work item: ${created.sequence_id} — ${created.name}`));
    } catch (err: any) {
      printError(err);
    }
  });
