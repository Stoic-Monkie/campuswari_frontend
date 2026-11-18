import { describe, expect, it } from "vitest";
import type { Comment } from "../../api/schemas";
import { makeMe } from "../../test/factories";
import { canDeleteComment } from "./permissions";

const comment: Comment = {
  id: "c1",
  postId: "p1",
  author: { id: "u-other", username: "other", displayName: "Other" },
  content: "hi",
  createdAt: "2026-11-13T00:00:00Z",
};

describe("canDeleteComment", () => {
  it("lets the comment's author and staff delete", () => {
    expect(canDeleteComment({ ...comment, author: { ...comment.author, id: "u-me" } }, makeMe())).toBe(true);
    expect(canDeleteComment(comment, makeMe({ role: "MODERATOR" }))).toBe(true);
    expect(canDeleteComment(comment, makeMe({ role: "ADMIN" }))).toBe(true);
  });
  it("does not let another student delete, even the post's author", () => {
    expect(canDeleteComment(comment, makeMe())).toBe(false);
    expect(canDeleteComment(comment, undefined)).toBe(false);
  });
});
