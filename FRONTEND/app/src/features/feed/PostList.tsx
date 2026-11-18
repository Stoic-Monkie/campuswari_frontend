import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ApiError, ErrorCode } from "../../api/errors";
import type { PostPage } from "../../api/schemas";
import { Button } from "../../components/Button";
import { EmptyState, ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { useMe } from "../me/useMe";
import { SafetyMenu } from "../moderation/SafetyMenu";
import { canDeletePost } from "./permissions";
import { PostCard } from "./PostCard";
import { usePostDeletion } from "./usePostDeletion";

/** The part of an infinite query this list needs (kept structural so any paged post query fits). */
export interface PagedPostsQuery {
  data: { pages: PostPage[] } | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

interface PostListProps {
  query: PagedPostsQuery;
  /** Cache key of the query, so a stale cursor can restart the list. */
  queryKey: readonly unknown[];
  emptyTitle: string;
  emptyHint?: string;
}

/** A paged list of posts with loading, empty and error states, auto-loading and delete. Used by the feed and profiles. */
export function PostList({ query, queryKey, emptyTitle, emptyHint }: PostListProps) {
  const queryClient = useQueryClient();
  const me = useMe().data;
  const deletion = usePostDeletion();
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const sentinel = useRef<HTMLDivElement>(null);

  // Load the next page automatically when the end of the list scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  // A rejected cursor means the saved position is stale: start again from the top.
  useEffect(() => {
    const e = query.error;
    if (e instanceof ApiError && e.code === ErrorCode.InvalidCursor) {
      void queryClient.resetQueries({ queryKey });
    }
  }, [query.error, queryClient, queryKey]);

  const posts = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      {query.isPending ? (
        <p role="status" className="py-8 text-center text-sm text-muted">
          Loading…
        </p>
      ) : query.isError && posts.length === 0 ? (
        <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState title={emptyTitle}>{emptyHint}</EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  canDelete={canDeletePost(post, me)}
                  onDelete={deletion.request}
                  menu={<SafetyMenu author={post.author} targetType="POST" targetId={post.id} />}
                />
              </li>
            ))}
          </ul>
          <div ref={sentinel} />
          {query.isFetchNextPageError ? (
            <ErrorState message={describeError(query.error)} onRetry={() => void fetchNextPage()} />
          ) : hasNextPage ? (
            <Button variant="secondary" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : (
            <p className="py-4 text-center text-xs text-muted">You’re all caught up.</p>
          )}
        </>
      )}
      {deletion.dialog}
    </>
  );
}
