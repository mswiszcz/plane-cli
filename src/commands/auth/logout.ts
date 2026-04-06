import { Command } from "commander";
import { loadCredentials, saveCredentials, resolveConfig } from "../../config.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const logoutCommand = new Command("logout")
  .description("Remove stored credentials")
  .argument("[workspace]", "Workspace to log out of (defaults to current)")
  .action(async (workspace) => {
    try {
      const slug = workspace ?? resolveConfig().workspace;
      if (!slug) {
        printError("No workspace specified and no default workspace configured.");
      }

      const creds = loadCredentials();
      if (!creds.workspaces?.[slug]) {
        printError(`No credentials found for workspace "${slug}".`);
      }

      delete creds.workspaces![slug];
      if (creds.default?.workspace === slug) {
        const remaining = Object.keys(creds.workspaces ?? {});
        creds.default!.workspace = remaining[0];
      }
      saveCredentials(creds);

      console.log(chalk.green(`Logged out of workspace "${slug}"`));
    } catch (err: any) {
      printError(err);
    }
  });
