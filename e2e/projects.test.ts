import { describe, it, expect } from "vitest";
import { runCli, runCliJson, TEST_PROJECT_IDENTIFIER } from "./helpers.js";

describe("project", () => {
  it("lists projects", () => {
    const projects = runCliJson<any[]>(["project", "list"]);
    expect(projects.length).toBeGreaterThan(0);
  });

  it("projects have expected fields", () => {
    const projects = runCliJson<any[]>(["project", "list"]);
    const project = projects[0];
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
    expect(project).toHaveProperty("identifier");
  });

  it("includes test project identifier", () => {
    const projects = runCliJson<any[]>(["project", "list"]);
    const identifiers = projects.map((p: any) => p.identifier);
    expect(identifiers).toContain(TEST_PROJECT_IDENTIFIER);
  });

  it("views a project by ID", () => {
    const projects = runCliJson<any[]>(["project", "list"]);
    const project = projects.find((p: any) => p.identifier === TEST_PROJECT_IDENTIFIER);

    const output = runCli(["project", "view", project!.id]);
    expect(output).toContain(TEST_PROJECT_IDENTIFIER);
  });

  it("works with alias 'p'", () => {
    const output = runCli(["p", "list"]);
    expect(output).toContain(TEST_PROJECT_IDENTIFIER);
  });
});
