import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queryKeys";
import type { Post, PostPage } from "../../api/schemas";

type ListData = InfiniteData<PostPage, string | undefined>;

/** Apply a change to every cached list of posts: the feed and every profile's posts. */
function mapLists(queryClient: QueryClient, change: (items: Post[]) => Post[]) {
  const update = (old: ListData | undefined): ListData | undefined =>
    old ? { ...old, pages: old.pages.map((pg) => ({ ...pg, items: change(pg.items) })) } : old;
  queryClient.setQueryData<ListData>(keys.feed, update);
  queryClient.setQueriesData<ListData>({ queryKey: keys.userPostsAll }, update);
}

/** Put a new post at the top of the cached feed; profile lists are reloaded the next time they are opened. */
export function addPostToFeed(queryClient: QueryClient, post: Post) {
  void queryClient.invalidateQueries({ queryKey: keys.userPostsAll });
  const had = queryClient.getQueryData<ListData>(keys.feed);
  if (!had) return;
  queryClient.setQueryData<ListData>(keys.feed, (old) => {
    if (!old || old.pages.length === 0) return old;
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first!, items: [post, ...first!.items] }, ...rest] };
  });
}

export function removePostFromLists(queryClient: QueryClient, id: string) {
  mapLists(queryClient, (items) => items.filter((x) => x.id !== id));
}

/** Find a post in the cached feed (used to paint the detail page instantly). */
export function findPostInFeed(queryClient: QueryClient, id: string): Post | undefined {
  const data = queryClient.getQueryData<ListData>(keys.feed);
  for (const page of data?.pages ?? []) {
    const hit = page.items.find((p) => p.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** The freshest cached copy of a post: the detail cache first, then the feed. */
export function findCachedPost(queryClient: QueryClient, id: string): Post | undefined {
  return queryClient.getQueryData<Post>(keys.post(id)) ?? findPostInFeed(queryClient, id);
}

/** Change one post everywhere it is cached (feed, profile lists, detail), so counts never disagree. */
export function patchPostInCaches(queryClient: QueryClient, id: string, change: (p: Post) => Post) {
  mapLists(queryClient, (items) => items.map((p) => (p.id === id ? change(p) : p)));
  queryClient.setQueryData<Post>(keys.post(id), (old) => (old ? change(old) : old));
}

/** Forget a post completely (deleted, hidden or no longer visible). */
export function removePostEverywhere(queryClient: QueryClient, id: string) {
  removePostFromLists(queryClient, id);
  queryClient.removeQueries({ queryKey: keys.post(id) });
  queryClient.removeQueries({ queryKey: keys.comments(id) });
}
