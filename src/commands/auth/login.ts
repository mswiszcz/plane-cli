import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import { PlaneClient } from "@makeplane/plane-node-sdk";
import { loadCredentials, saveCredentials, DEFAULT_BASE_URL } from "../../config.js";
import { printError } from "../../output.js";
import chalk from "chalk";

export const loginCommand = new Command("login")
  .description("Authenticate with Plane")
  .option("--key <key>", "API key")
  .option("--workspace <slug>", "Workspace slug")
  .option("--base-url <url>", "Base URL for self-hosted instances")
  .action(async (opts) => {
    try {
      const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
      const apiKey =
        opts.key ?? (await password({ message: "Enter your Plane API key:" }));
      const workspaceSlug =
        opts.workspace ??
        (await input({ message: "Enter your workspace slug:" }));

      // Validate the key by fetching current user
      const client = new PlaneClient({ apiKey, baseUrl });
      const user = await client.users.me();
      console.log(
        chalk.green(`Authenticated as ${user.display_name ?? user.email}`)
      );

      // Store credentials
      const creds = loadCredentials();
      if (!creds.workspaces) creds.workspaces = {};
      creds.workspaces[workspaceSlug] = { api_key: apiKey, base_url: baseUrl };
      if (!creds.default) creds.default = {};
      creds.default.workspace = creds.default.workspace ?? workspaceSlug;
      saveCredentials(creds);

      console.log(
        chalk.green(`Credentials saved for workspace "${workspaceSlug}"`)
      );
    } catch (err: any) {
      printError(err ?? "Authentication failed");
    }
  });
