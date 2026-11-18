import { api } from "../client";
import { meSchema, postPageSchema, userProfileSchema } from "../schemas";

export function getMe() {
  return api.request("/users/me", { schema: meSchema });
}

/** Missing or null fields stay unchanged; an empty bio clears it. */
export function updateMe(body: { displayName?: string; bio?: string; avatarUploadId?: string }) {
  return api.request("/users/me", { method: "PATCH", body, schema: meSchema });
}

export function getProfile(username: string) {
  return api.request(`/users/${encodeURIComponent(username)}`, { schema: userProfileSchema });
}

export function listUserPosts(username: string, params: { cursor?: string | undefined } = {}) {
  const qs = params.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : "";
  return api.request(`/users/${encodeURIComponent(username)}/posts${qs}`, { schema: postPageSchema });
}
