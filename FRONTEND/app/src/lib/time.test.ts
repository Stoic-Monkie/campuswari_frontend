import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

const now = new Date("2026-11-12T12:00:00Z").getTime();
const ago = (s: number) => new Date(now - s * 1000).toISOString();

describe("timeAgo", () => {
  it("uses short relative units", () => {
    expect(timeAgo(ago(5), now)).toBe("now");
    expect(timeAgo(ago(5 * 60), now)).toBe("5m");
    expect(timeAgo(ago(3 * 3600), now)).toBe("3h");
    expect(timeAgo(ago(2 * 86400), now)).toBe("2d");
  });
  it("never shows a negative time for a clock that is slightly ahead", () => {
    expect(timeAgo(new Date(now + 5000).toISOString(), now)).toBe("now");
  });
  it("returns an empty string for a bad date", () => {
    expect(timeAgo("nonsense", now)).toBe("");
  });
});
