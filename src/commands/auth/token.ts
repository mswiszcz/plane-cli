import { Command } from "commander";
import { resolveConfig, resolveCredential } from "../../config.js";
import { printError } from "../../output.js";

export const tokenCommand = new Command("token")
  .description("Print the current API key")
  .action(() => {
    try {
      const config = resolveConfig();
      const { apiKey } = resolveCredential(config);
      process.stdout.write(apiKey);
    } catch (err: any) {
      printError(err);
    }
  });
