import { api } from "../client";
import { postPageSchema, postSchema } from "../schemas";

export function listPosts(params: { cursor?: string | undefined; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return api.request(`/posts${query ? `?${query}` : ""}`, { schema: postPageSchema });
}

export function getPost(id: string) {
  return api.request(`/posts/${encodeURIComponent(id)}`, { schema: postSchema });
}

export function createPost(body: { content: string; imageUploadId?: string }) {
  return api.request("/posts", { method: "POST", body, schema: postSchema });
}

export function deletePost(id: string) {
  return api.request(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
