import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/errors";
import { staffActionError } from "./staffErrors";

const e = (status: number) => new ApiError({ status });

describe("staffActionError", () => {
  it("explains a report somebody else already resolved", () => {
    expect(staffActionError(e(409), "resolve")).toMatch(/already resolved/);
  });
  it("explains the refusals specific to suspending", () => {
    expect(staffActionError(e(400), "suspend")).toMatch(/yourself/);
    expect(staffActionError(e(403), "suspend")).toMatch(/Admins can’t be suspended/);
  });
  it("says a gone item no longer exists", () => {
    expect(staffActionError(e(404), "hide")).toMatch(/no longer exists/);
  });
  it("falls back to a general permission or generic message", () => {
    expect(staffActionError(e(403), "hide")).toMatch(/permission/);
    expect(staffActionError(new Error("x"), "hide")).toMatch(/went wrong/i);
  });
});
