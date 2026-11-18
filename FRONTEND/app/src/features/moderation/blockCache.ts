import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queryKeys";
import type { Comment, CommentPage, Post, PostPage, UserProfile } from "../../api/schemas";

type PostLists = InfiniteData<PostPage, string | undefined>;
type CommentLists = InfiniteData<CommentPage, string | undefined>;

/**
 * After blocking someone their posts, comments and profile disappear for us
 * (the API answers 404 for them). Remove them from every cache right away.
 */
export function hideAuthorEverywhere(queryClient: QueryClient, userId: string) {
  const posts = (old: PostLists | undefined): PostLists | undefined =>
    old
      ? { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.filter((p) => p.author.id !== userId) })) }
      : old;
  const comments = (old: CommentLists | undefined): CommentLists | undefined =>
    old
      ? { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.filter((c: Comment) => c.author.id !== userId) })) }
      : old;

  queryClient.setQueryData<PostLists>(keys.feed, posts);
  queryClient.setQueriesData<PostLists>({ queryKey: keys.userPostsAll }, posts);
  queryClient.setQueriesData<CommentLists>({ queryKey: keys.commentsAll }, comments);
  queryClient.removeQueries({
    queryKey: ["post"],
    predicate: (q) => (q.state.data as Post | undefined)?.author?.id === userId,
  });
  queryClient.removeQueries({
    queryKey: ["profile"],
    predicate: (q) => (q.state.data as UserProfile | undefined)?.id === userId,
  });
}

/** After unblocking, their content is visible again, so reload what we hold. */
export function refreshContentCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: keys.feed });
  void queryClient.invalidateQueries({ queryKey: keys.userPostsAll });
  void queryClient.invalidateQueries({ queryKey: keys.commentsAll });
  void queryClient.invalidateQueries({ queryKey: ["post"] });
}
