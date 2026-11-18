import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePost, unlikePost } from "../../api/endpoints/likes";
import { ApiError } from "../../api/errors";
import { findCachedPost, patchPostInCaches, removePostEverywhere } from "./feedCache";

/**
 * Like or unlike with an instant (optimistic) update. The server's answer then
 * replaces our guess; if the call fails the old state comes back.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, like }: { id: string; like: boolean }) => (like ? likePost(id) : unlikePost(id)),
    onMutate: ({ id, like }) => {
      const before = findCachedPost(queryClient, id);
      patchPostInCaches(queryClient, id, (p) => {
        const delta = like === p.likedByMe ? 0 : like ? 1 : -1;
        return { ...p, likedByMe: like, likeCount: Math.max(0, p.likeCount + delta) };
      });
      return { before };
    },
    onSuccess: (state, { id }) => {
      patchPostInCaches(queryClient, id, (p) => ({ ...p, likedByMe: state.likedByMe, likeCount: state.likeCount }));
    },
    onError: (e, { id }, ctx) => {
      // 404: the post is gone or no longer visible to us.
      if (e instanceof ApiError && e.status === 404) {
        removePostEverywhere(queryClient, id);
        return;
      }
      const before = ctx?.before;
      if (before) {
        patchPostInCaches(queryClient, id, (p) => ({ ...p, likedByMe: before.likedByMe, likeCount: before.likeCount }));
      }
    },
  });
}
