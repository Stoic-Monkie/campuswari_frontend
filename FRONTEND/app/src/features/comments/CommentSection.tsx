import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteComment } from "../../api/endpoints/comments";
import { ApiError } from "../../api/errors";
import type { Comment } from "../../api/schemas";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState, ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { patchPostInCaches } from "../feed/feedCache";
import { useMe } from "../me/useMe";
import { SafetyMenu } from "../moderation/SafetyMenu";
import { removeComment } from "./commentCache";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { canDeleteComment } from "./permissions";
import { useComments } from "./useComments";

export function CommentSection({ postId, onPostGone }: { postId: string; onPostGone?: () => void }) {
  const queryClient = useQueryClient();
  const me = useMe().data;
  const comments = useComments(postId);
  const [toDelete, setToDelete] = useState<Comment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const finishDelete = (c: Comment) => {
    removeComment(queryClient, postId, c.id);
    patchPostInCaches(queryClient, postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
    setToDelete(null);
    setDeleteError(null);
  };

  const remove = useMutation({
    mutationFn: (c: Comment) => deleteComment(c.id),
    onSuccess: (_d, c) => finishDelete(c),
    onError: (e, c) => {
      if (e instanceof ApiError && e.status === 404) finishDelete(c);
      else setDeleteError(describeError(e));
    },
  });

  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-label="Comments" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted">Comments</h2>
      <CommentComposer postId={postId} {...(onPostGone ? { onGone: onPostGone } : {})} />

      {comments.isPending ? (
        <p role="status" className="py-4 text-center text-sm text-muted">
          Loading comments…
        </p>
      ) : comments.isError && items.length === 0 ? (
        <ErrorState message={describeError(comments.error)} onRetry={() => void comments.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No comments yet">Start the conversation.</EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  canDelete={canDeleteComment(c, me)}
                  menu={<SafetyMenu author={c.author} targetType="COMMENT" targetId={c.id} />}
                  onDelete={(x) => {
                    setDeleteError(null);
                    setToDelete(x);
                  }}
                />
              </li>
            ))}
          </ul>
          {comments.isFetchNextPageError ? (
            <ErrorState message={describeError(comments.error)} onRetry={() => void comments.fetchNextPage()} />
          ) : comments.hasNextPage ? (
            <Button
              variant="secondary"
              onClick={() => void comments.fetchNextPage()}
              disabled={comments.isFetchingNextPage}
            >
              {comments.isFetchingNextPage ? "Loading…" : "Load more comments"}
            </Button>
          ) : null}
        </>
      )}

      {toDelete ? (
        <ConfirmDialog
          title="Delete this comment?"
          message="This can’t be undone."
          confirmLabel="Delete"
          busy={remove.isPending}
          error={deleteError}
          onConfirm={() => remove.mutate(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      ) : null}
    </section>
  );
}
