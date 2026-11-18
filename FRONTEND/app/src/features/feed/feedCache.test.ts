import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { keys } from "../../api/queryKeys";
import type { Post, PostPage } from "../../api/schemas";
import { makePost } from "../../test/factories";
import { patchPostInCaches, removePostEverywhere } from "./feedCache";

const list = (...posts: Post[]) => ({ pages: [{ items: posts, nextCursor: null } as PostPage], pageParams: [undefined] });

function seeded() {
  const qc = new QueryClient();
  qc.setQueryData(keys.feed, list(makePost({ id: "a" }), makePost({ id: "b" })));
  qc.setQueryData(keys.userPosts("other"), list(makePost({ id: "a" })));
  qc.setQueryData(keys.post("a"), makePost({ id: "a" }));
  return qc;
}

const ids = (qc: QueryClient, key: readonly unknown[]) =>
  (qc.getQueryData<ReturnType<typeof list>>(key)?.pages ?? []).flatMap((p) => p.items.map((i) => i.id));

describe("post caches", () => {
  it("patches a post in the feed, profile lists and the detail cache together", () => {
    const qc = seeded();
    patchPostInCaches(qc, "a", (p) => ({ ...p, likeCount: 9 }));
    expect(qc.getQueryData<ReturnType<typeof list>>(keys.feed)?.pages[0]?.items[0]?.likeCount).toBe(9);
    expect(qc.getQueryData<ReturnType<typeof list>>(keys.userPosts("other"))?.pages[0]?.items[0]?.likeCount).toBe(9);
    expect(qc.getQueryData<Post>(keys.post("a"))?.likeCount).toBe(9);
    expect(qc.getQueryData<ReturnType<typeof list>>(keys.feed)?.pages[0]?.items[1]?.likeCount).toBe(0);
  });

  it("removes a post from every list and the detail cache", () => {
    const qc = seeded();
    removePostEverywhere(qc, "a");
    expect(ids(qc, keys.feed)).toEqual(["b"]);
    expect(ids(qc, keys.userPosts("other"))).toEqual([]);
    expect(qc.getQueryData(keys.post("a"))).toBeUndefined();
  });

  it("does nothing when nothing is cached", () => {
    const qc = new QueryClient();
    expect(() => patchPostInCaches(qc, "x", (p) => p)).not.toThrow();
    expect(() => removePostEverywhere(qc, "x")).not.toThrow();
  });
});
