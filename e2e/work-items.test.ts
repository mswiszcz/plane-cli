import { describe, it, expect } from "vitest";
import { runCli, runCliJson, TEST_PROJECT_ID, TEST_PROJECT_IDENTIFIER } from "./helpers.js";

describe("work-item", () => {
  describe("list", () => {
    it("lists work items from test project", () => {
      const items = runCliJson<any[]>(["work-item", "list"], { project: TEST_PROJECT_ID });
      expect(items.length).toBeGreaterThan(0);
    });

    it("work items have expected fields", () => {
      const items = runCliJson<any[]>(["work-item", "list"], { project: TEST_PROJECT_ID });
      const item = items[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("sequence_id");
      expect(item).toHaveProperty("state");
      expect(item.state).toHaveProperty("name");
    });

    it("respects --limit flag", () => {
      const items = runCliJson<any[]>(["work-item", "list", "--limit", "3"], { project: TEST_PROJECT_ID });
      expect(items.length).toBeLessThanOrEqual(3);
    });

    it("works with alias 'wi'", () => {
      const items = runCliJson<any[]>(["wi", "list", "--limit", "1"], { project: TEST_PROJECT_ID });
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe("view", () => {
    it("views a work item by sequence ID", () => {
      const output = runCli(["work-item", "view", `${TEST_PROJECT_IDENTIFIER}-1`]);
      expect(output).toContain(`${TEST_PROJECT_IDENTIFIER}-1`);
    });

    it("views a work item by sequence ID with --json", () => {
      const item = runCliJson<any>(["work-item", "view", `${TEST_PROJECT_IDENTIFIER}-1`]);
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item.sequence_id).toBe(1);
    });

    it("views a work item by UUID", () => {
      // First get a UUID from list
      const items = runCliJson<any[]>(["work-item", "list", "--limit", "1"], { project: TEST_PROJECT_ID });
      const uuid = items[0].id;

      const item = runCliJson<any>(["work-item", "view", uuid], { project: TEST_PROJECT_ID });
      expect(item.id).toBe(uuid);
    });
  });

  describe("create, update, delete lifecycle", () => {
    let createdId: string;
    let sequenceId: number;

    it("creates a work item", () => {
      const item = runCliJson<any>(
        ["work-item", "create", "-t", "E2E Test Work Item", "-p", "low"],
        { project: TEST_PROJECT_ID }
      );
      expect(item).toHaveProperty("id");
      expect(item.name).toBe("E2E Test Work Item");
      createdId = item.id;
      sequenceId = item.sequence_id;
    });

    it("updates the work item title", () => {
      const updated = runCliJson<any>(
        ["work-item", "update", `${TEST_PROJECT_IDENTIFIER}-${sequenceId}`, "-t", "E2E Updated Title"],
      );
      expect(updated.name).toBe("E2E Updated Title");
    });

    it("updates the work item priority", () => {
      const updated = runCliJson<any>(
        ["work-item", "update", `${TEST_PROJECT_IDENTIFIER}-${sequenceId}`, "-p", "high"],
      );
      expect(updated.priority).toBe("high");
    });

    it("deletes the work item", () => {
      const output = runCli(
        ["work-item", "delete", `${TEST_PROJECT_IDENTIFIER}-${sequenceId}`, "-y"],
      );
      expect(output).toContain("Deleted");
    });
  });
});
