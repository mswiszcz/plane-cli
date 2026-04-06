import { describe, it, expect } from "vitest";
import { runCli, API_KEY, WORKSPACE } from "./helpers.js";

describe("auth", () => {
  it("auth status shows current user", () => {
    const output = runCli(["auth", "status"]);
    expect(output).toContain("Workspace:");
    expect(output).toContain(WORKSPACE);
  });

  it("auth token prints the API key", () => {
    const output = runCli(["auth", "token"]);
    expect(output).toBe(API_KEY);
  });
});
