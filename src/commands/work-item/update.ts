import { Command } from "commander";
import { getClient, requireProject } from "../../client.js";
import { printJson, printError } from "../../output.js";
import { isSequenceId } from "../../resolve-id.js";
import chalk from "chalk";
import type { UpdateWorkItem, PriorityEnum } from "@makeplane/plane-node-sdk";

export const updateWorkItemCommand = new Command("update")
  .description("Update a work item")
  .argument("<id>", "Work item ID (PROJ-123 or UUID)")
  .option("-t, --title <title>", "New title")
  .option("-s, --state <state>", "State name")
  .option("-p, --priority <priority>", "Priority (urgent/high/medium/low/none)")
  .option("-a, --assignee <name>", "Assignee display name or email")
  .option("-l, --label <name...>", "Label names")
  .option("-j, --json", "Output as JSON")
  .action(async (id, opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      // Resolve work item to get projectId
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

      const payload: UpdateWorkItem = {};
      if (opts.title) payload.name = opts.title;
      if (opts.priority) payload.priority = opts.priority as PriorityEnum;

      if (opts.state) {
        const statesResp = await client.states.list(workspace, projectId);
        const match = statesResp.results.find(
          (s) => s.name.toLowerCase() === opts.state.toLowerCase()
        );
        if (!match) printError(`State "${opts.state}" not found.`);
        payload.state = match!.id;
      }

      if (opts.assignee) {
        const members = await client.projects.getMembers(workspace, projectId);
        const match = members.find(
          (m) =>
            m.display_name?.toLowerCase() === opts.assignee.toLowerCase() ||
            m.email?.toLowerCase() === opts.assignee.toLowerCase()
        );
        if (!match) printError(`Assignee "${opts.assignee}" not found.`);
        payload.assignees = [match!.id!];
      }

      if (opts.label) {
        const labelsResp = await client.labels.list(workspace, projectId);
        const labelIds: string[] = [];
        for (const name of opts.label) {
          const match = labelsResp.results.find(
            (l) => l.name.toLowerCase() === name.toLowerCase()
          );
          if (!match) printError(`Label "${name}" not found.`);
          labelIds.push(match!.id);
        }
        payload.labels = labelIds;
      }

      if (Object.keys(payload).length === 0) {
        printError("No updates specified. Use --title, --state, --priority, --assignee, or --label.");
      }

      const updated = await client.workItems.update(workspace, projectId, workItemId, payload);

      if (opts.json) {
        printJson(updated);
        return;
      }

      console.log(chalk.green(`Updated work item: ${updated.sequence_id} — ${updated.name}`));
    } catch (err: any) {
      printError(err);
    }
  });
