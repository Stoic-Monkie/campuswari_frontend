import { api } from "../client";
import { blockedUserPageSchema } from "../schemas";

/** Blocking is two-way and invisible. Both calls are idempotent and answer 204. */
export function blockUser(id: string) {
  return api.request(`/users/${encodeURIComponent(id)}/block`, { method: "PUT" });
}

export function unblockUser(id: string) {
  return api.request(`/users/${encodeURIComponent(id)}/block`, { method: "DELETE" });
}

/** People you blocked, newest first. The only place a blocked person can be found again. */
export function listBlocks(params: { cursor?: string | undefined } = {}) {
  const qs = params.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : "";
  return api.request(`/users/me/blocks${qs}`, { schema: blockedUserPageSchema });
}
