import { describe, expect, it } from "vitest";
import { isAdmin, isStaff } from "./roles";

describe("roles", () => {
  it("treats moderators and admins as staff, students and unknown users as not", () => {
    expect(isStaff({ role: "MODERATOR" })).toBe(true);
    expect(isStaff({ role: "ADMIN" })).toBe(true);
    expect(isStaff({ role: "STUDENT" })).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
  it("only admins are admins", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
    expect(isAdmin({ role: "MODERATOR" })).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
