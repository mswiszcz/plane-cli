import { describe, it, expect } from "vitest";
import { runCli, runCliJson, TEST_PROJECT_ID, TEST_PROJECT_IDENTIFIER } from "./helpers.js";

describe("work-item comment", () => {
  let testWorkItemSeqId: number;
  let testWorkItemId: string;

  it("setup: create a work item for comment tests", () => {
    const item = runCliJson<any>(
      ["work-item", "create", "-t", "E2E Comment Test Item"],
      { project: TEST_PROJECT_ID }
    );
    testWorkItemId = item.id;
    testWorkItemSeqId = item.sequence_id;
    expect(item.id).toBeTruthy();
  });

  it("adds a comment to a work item", () => {
    const output = runCli([
      "work-item", "comment", "add", `${TEST_PROJECT_IDENTIFIER}-${testWorkItemSeqId}`,
      "--body", "This is an e2e test comment",
    ]);
    expect(output).toContain("Comment added");
  });

  it("lists comments on the work item", () => {
    const comments = runCliJson<any[]>([
      "work-item", "comment", "list", `${TEST_PROJECT_IDENTIFIER}-${testWorkItemSeqId}`,
    ]);
    expect(comments.length).toBeGreaterThanOrEqual(1);
    const found = comments.some((c: any) =>
      c.comment_html?.includes("e2e test comment") ||
      c.comment_stripped?.includes("e2e test comment")
    );
    expect(found).toBe(true);
  });

  it("cleanup: delete the test work item", () => {
    const output = runCli([
      "work-item", "delete", `${TEST_PROJECT_IDENTIFIER}-${testWorkItemSeqId}`, "-y",
    ]);
    expect(output).toContain("Deleted");
  });
});
