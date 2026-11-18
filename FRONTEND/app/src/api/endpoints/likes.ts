import { api } from "../client";
import { likeStateSchema } from "../schemas";

/** Both calls are idempotent and return the new state. */
export function likePost(id: string) {
  return api.request(`/posts/${encodeURIComponent(id)}/like`, { method: "PUT", schema: likeStateSchema });
}

export function unlikePost(id: string) {
  return api.request(`/posts/${encodeURIComponent(id)}/like`, { method: "DELETE", schema: likeStateSchema });
}
