import { describe, it, expect } from "vitest";
import { runCliJson } from "./helpers.js";

describe("member", () => {
  it("lists workspace members", () => {
    const members = runCliJson<any[]>(["member", "list"]);
    expect(members.length).toBeGreaterThanOrEqual(1);

    const member = members[0];
    expect(member).toHaveProperty("email");
    expect(member).toHaveProperty("display_name");
  });
});
