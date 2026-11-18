import { describe, expect, it } from "vitest";
import { makeMe, makePost } from "../../test/factories";
import { canDeletePost } from "./permissions";

describe("canDeletePost", () => {
  const post = makePost({ id: "1" });
  it("lets the author delete", () => {
    expect(canDeletePost(makePost({ id: "1", author: { ...post.author, id: "u-me" } }), makeMe())).toBe(true);
  });
  it("lets staff delete anyone's post", () => {
    expect(canDeletePost(post, makeMe({ role: "MODERATOR" }))).toBe(true);
    expect(canDeletePost(post, makeMe({ role: "ADMIN" }))).toBe(true);
  });
  it("does not let another student delete", () => {
    expect(canDeletePost(post, makeMe())).toBe(false);
  });
  it("is false while the user is still loading", () => {
    expect(canDeletePost(post, undefined)).toBe(false);
  });
});
