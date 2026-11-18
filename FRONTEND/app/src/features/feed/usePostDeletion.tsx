import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type ReactNode } from "react";
import { deletePost } from "../../api/endpoints/posts";
import { ApiError } from "../../api/errors";
import type { Post } from "../../api/schemas";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { describeError } from "../../lib/errorMessages";
import { removePostEverywhere } from "./feedCache";

/**
 * Delete-with-confirmation, shared by the feed and the post page.
 * Call `request(post)` to open the dialog; render `dialog` somewhere in the page.
 */
export function usePostDeletion(onDeleted?: (post: Post) => void): {
  request: (post: Post) => void;
  dialog: ReactNode;
} {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(
    (post: Post) => {
      removePostEverywhere(queryClient, post.id);
      setTarget(null);
      setError(null);
      onDeleted?.(post);
    },
    [queryClient, onDeleted],
  );

  const remove = useMutation({
    mutationFn: (post: Post) => deletePost(post.id),
    onSuccess: (_d, post) => finish(post),
    onError: (e, post) => {
      // 404 means it is already gone (deleted or hidden): treat as done.
      if (e instanceof ApiError && e.status === 404) finish(post);
      else setError(describeError(e));
    },
  });

  const request = useCallback((post: Post) => {
    setError(null);
    setTarget(post);
  }, []);

  const dialog = target ? (
    <ConfirmDialog
      title="Delete this post?"
      message="This can’t be undone."
      confirmLabel="Delete"
      busy={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(target)}
      onCancel={() => setTarget(null)}
    />
  ) : null;

  return { request, dialog };
}
