import { api } from "../client";
import { commentPageSchema, commentSchema } from "../schemas";

export function listComments(postId: string, params: { cursor?: string | undefined } = {}) {
  const qs = params.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : "";
  return api.request(`/posts/${encodeURIComponent(postId)}/comments${qs}`, { schema: commentPageSchema });
}

export function createComment(postId: string, content: string) {
  return api.request(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: { content },
    schema: commentSchema,
  });
}

export function deleteComment(id: string) {
  return api.request(`/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
}
