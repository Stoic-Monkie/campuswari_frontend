import { api } from "../client";
import { reportPageSchema, staffCommentPageSchema, staffPostPageSchema, staffUserPageSchema } from "../schemas";

export type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
export type ReportResolution = "ACTIONED" | "DISMISSED";

/** The moderation queue, oldest first. Staff only (students get 403). */
export function listReports(params: { status: ReportStatus; cursor?: string | undefined }) {
  const qs = new URLSearchParams({ status: params.status });
  if (params.cursor) qs.set("cursor", params.cursor);
  return api.request(`/admin/reports?${qs.toString()}`, { schema: reportPageSchema });
}

/** 204; 409 if somebody already resolved it. */
export function resolveReport(id: string, resolution: ReportResolution) {
  return api.request(`/admin/reports/${encodeURIComponent(id)}/resolve`, { method: "POST", body: { resolution } });
}

// Hide, unhide, suspend and reinstate are idempotent (204 both times).
const act = (path: string) => api.request(path, { method: "POST" });
const enc = encodeURIComponent;

export const hidePost = (id: string) => act(`/admin/posts/${enc(id)}/hide`);
export const unhidePost = (id: string) => act(`/admin/posts/${enc(id)}/unhide`);
export const hideComment = (id: string) => act(`/admin/comments/${enc(id)}/hide`);
export const unhideComment = (id: string) => act(`/admin/comments/${enc(id)}/unhide`);
/** Admins only. Cannot suspend yourself (400) or another admin (403). */
export const suspendUser = (id: string) => act(`/admin/users/${enc(id)}/suspend`);
export const reinstateUser = (id: string) => act(`/admin/users/${enc(id)}/reinstate`);

const withCursor = (cursor: string | undefined) => (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

/** Posts a moderator hid, newest first. This is how hidden content is found again (patch 14). */
export function listHiddenPosts(params: { cursor?: string | undefined } = {}) {
  return api.request(`/admin/posts?status=HIDDEN${withCursor(params.cursor)}`, { schema: staffPostPageSchema });
}

export function listHiddenComments(params: { cursor?: string | undefined } = {}) {
  return api.request(`/admin/comments?status=HIDDEN${withCursor(params.cursor)}`, { schema: staffCommentPageSchema });
}

export type AccountStatus = "SUSPENDED" | "ACTIVE";

/** Admin only. `q` is a username prefix of 2 to 30 characters; leave it out to list everyone with that status. */
export function listUsers(params: { status: AccountStatus; q?: string | undefined; cursor?: string | undefined }) {
  const qs = new URLSearchParams({ status: params.status });
  if (params.q) qs.set("q", params.q);
  if (params.cursor) qs.set("cursor", params.cursor);
  return api.request(`/admin/users?${qs.toString()}`, { schema: staffUserPageSchema });
}
