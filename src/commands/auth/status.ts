import { Command } from "commander";
import { getClient } from "../../client.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const statusCommand = new Command("status")
  .description("Show current authentication status")
  .action(async () => {
    try {
      const { client, workspace } = getClient();
      const user = await client.users.me();

      console.log(`${chalk.bold("Workspace:")} ${workspace}`);
      console.log(`${chalk.bold("User:")} ${user.display_name ?? user.email}`);
      console.log(`${chalk.bold("Email:")} ${user.email}`);
    } catch (err: any) {
      printError(err);
    }
  });
