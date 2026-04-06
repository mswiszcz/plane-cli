import { describe, it, expect } from "vitest";
import { runCliJson, TEST_PROJECT_ID } from "./helpers.js";

describe("state", () => {
  it("lists states for test project", () => {
    const states = runCliJson<any[]>(["state", "list"], { project: TEST_PROJECT_ID });
    expect(states.length).toBeGreaterThanOrEqual(5);

    const names = states.map((s: any) => s.name).sort();
    expect(names).toContain("Backlog");
    expect(names).toContain("Todo");
    expect(names).toContain("In Progress");
    expect(names).toContain("Done");
    expect(names).toContain("Cancelled");
  });

  it("states have group field", () => {
    const states = runCliJson<any[]>(["state", "list"], { project: TEST_PROJECT_ID });
    const groups = states.map((s: any) => s.group).sort();
    expect(groups).toContain("backlog");
    expect(groups).toContain("unstarted");
    expect(groups).toContain("started");
    expect(groups).toContain("completed");
    expect(groups).toContain("cancelled");
  });
});
