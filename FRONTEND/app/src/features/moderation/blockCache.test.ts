import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { keys } from "../../api/queryKeys";
import type { Comment, CommentPage, Post, PostPage, UserProfile } from "../../api/schemas";
import { makePost } from "../../test/factories";
import { hideAuthorEverywhere } from "./blockCache";

const author = (id: string) => ({ id, username: id.replace("u-", ""), displayName: id });
const postList = (...p: Post[]) => ({ pages: [{ items: p, nextCursor: null } as PostPage], pageParams: [undefined] });
const comment = (id: string, authorId: string): Comment => ({ id, postId: "p1", author: author(authorId), content: id, createdAt: "x" });
const commentList = (...c: Comment[]) => ({ pages: [{ items: c, nextCursor: null } as CommentPage], pageParams: [undefined] });

describe("hideAuthorEverywhere", () => {
  it("removes the blocked person's posts, comments, post page and profile from every cache", () => {
    const qc = new QueryClient();
    const bad = author("u-bad");
    const good = author("u-good");
    qc.setQueryData(keys.feed, postList(makePost({ id: "a", author: bad }), makePost({ id: "b", author: good })));
    qc.setQueryData(keys.userPosts("good"), postList(makePost({ id: "c", author: bad }), makePost({ id: "d", author: good })));
    qc.setQueryData(keys.comments("p1"), commentList(comment("c1", "u-bad"), comment("c2", "u-good")));
    qc.setQueryData(keys.post("a"), makePost({ id: "a", author: bad }));
    qc.setQueryData(keys.post("b"), makePost({ id: "b", author: good }));
    qc.setQueryData<UserProfile>(keys.profile("bad"), { id: "u-bad", username: "bad", displayName: "Bad", createdAt: "x" });
    qc.setQueryData<UserProfile>(keys.profile("good"), { id: "u-good", username: "good", displayName: "Good", createdAt: "x" });

    hideAuthorEverywhere(qc, "u-bad");

    const ids = (key: readonly unknown[]) =>
      (qc.getQueryData<ReturnType<typeof postList>>(key)?.pages ?? []).flatMap((p) => p.items.map((i) => i.id));
    expect(ids(keys.feed)).toEqual(["b"]);
    expect(ids(keys.userPosts("good"))).toEqual(["d"]);
    expect(qc.getQueryData<ReturnType<typeof commentList>>(keys.comments("p1"))?.pages[0]?.items.map((c) => c.id)).toEqual(["c2"]);
    expect(qc.getQueryData(keys.post("a"))).toBeUndefined();
    expect(qc.getQueryData(keys.post("b"))).toBeDefined();
    expect(qc.getQueryData(keys.profile("bad"))).toBeUndefined();
    expect(qc.getQueryData(keys.profile("good"))).toBeDefined();
  });

  it("does nothing when nothing is cached", () => {
    expect(() => hideAuthorEverywhere(new QueryClient(), "u-x")).not.toThrow();
  });
});
