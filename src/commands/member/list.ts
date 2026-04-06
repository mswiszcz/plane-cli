import { Command } from "commander";
import { getClient } from "../../client.js";
import { printTable, printJson, printError } from "../../output.js";
import type { User } from "@makeplane/plane-node-sdk";

export const listMembersCommand = new Command("list")
  .description("List members")
  .option("-j, --json", "Output as JSON")
  .action(async (opts) => {
    try {
      const resolved = getClient();
      const { client, workspace } = resolved;

      let members: User[];
      if (resolved.project) {
        members = await client.projects.getMembers(workspace, resolved.project);
      } else {
        members = await client.workspace.getMembers(workspace);
      }

      if (opts.json) {
        printJson(members);
        return;
      }

      printTable(members, [
        { header: "Display Name", key: "display_name" },
        { header: "Email", key: "email" },
        {
          header: "Name",
          key: (r: User) =>
            [r.first_name, r.last_name].filter(Boolean).join(" ") || "",
        },
      ]);
    } catch (err: any) {
      printError(err);
    }
  });
