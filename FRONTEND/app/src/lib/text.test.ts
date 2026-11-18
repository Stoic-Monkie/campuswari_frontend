import { describe, expect, it } from "vitest";
import { USERNAME_RE } from "./limits";
import { cpLength } from "./text";

describe("cpLength", () => {
  it("counts characters, not UTF-16 units", () => {
    expect(cpLength("abc")).toBe(3);
    expect(cpLength("😀")).toBe(1);
    expect("😀".length).toBe(2);
  });
});

describe("USERNAME_RE", () => {
  it.each(["abc", "a_b", "a1_b2"])("accepts %s", (v) => expect(USERNAME_RE.test(v)).toBe(true));
  it.each(["_ab", "ab_", "a__b", "A", "a-b", "a b"])("rejects %s", (v) =>
    expect(USERNAME_RE.test(v)).toBe(false),
  );
});
