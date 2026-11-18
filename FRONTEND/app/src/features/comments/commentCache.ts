import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queryKeys";
import type { Comment, CommentPage } from "../../api/schemas";

type CommentData = InfiniteData<CommentPage, string | undefined>;

/**
 * Comments are oldest first, so a new one belongs at the very end. If the end
 * has not been loaded yet we cannot place it, so the list is reloaded instead.
 */
export function appendComment(queryClient: QueryClient, postId: string, comment: Comment) {
  const data = queryClient.getQueryData<CommentData>(keys.comments(postId));
  if (!data || data.pages.length === 0) return;
  const last = data.pages[data.pages.length - 1]!;
  if (last.nextCursor) {
    void queryClient.invalidateQueries({ queryKey: keys.comments(postId) });
    return;
  }
  queryClient.setQueryData<CommentData>(keys.comments(postId), {
    ...data,
    pages: [...data.pages.slice(0, -1), { ...last, items: [...last.items, comment] }],
  });
}

export function removeComment(queryClient: QueryClient, postId: string, commentId: string) {
  queryClient.setQueryData<CommentData>(keys.comments(postId), (old) =>
    old
      ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== commentId) })) }
      : old,
  );
}
