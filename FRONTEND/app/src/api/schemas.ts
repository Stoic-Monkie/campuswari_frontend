import { z } from "zod";

/*
  Response shapes. THE ONLY FILE THAT KNOWS FIELD NAMES.
  Source: docs/frontend/openapi.json (generated from the real controllers).
  The spec never marks response fields required, and optional fields can come
  back null OR be absent, so every optional field here is .nullish().
*/

export const messageResponseSchema = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof messageResponseSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshToken: z.string().nullish(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const roleSchema = z.enum(["STUDENT", "MODERATOR", "ADMIN"]);
export type Role = z.infer<typeof roleSchema>;

export const authorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
});
export type Author = z.infer<typeof authorSchema>;

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  role: roleSchema,
  emailVerified: z.boolean(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  createdAt: z.string(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const postSchema = z.object({
  id: z.string(),
  author: authorSchema,
  content: z.string(),
  imageUrl: z.string().nullish(),
  likeCount: z.number(),
  commentCount: z.number(),
  likedByMe: z.boolean(),
  createdAt: z.string(),
});
export type Post = z.infer<typeof postSchema>;

export const postPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: z.string().nullish(),
});
export type PostPage = z.infer<typeof postPageSchema>;

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: authorSchema,
  content: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentPageSchema = z.object({
  items: z.array(commentSchema),
  nextCursor: z.string().nullish(),
});
export type CommentPage = z.infer<typeof commentPageSchema>;

export const likeStateSchema = z.object({
  likedByMe: z.boolean(),
  likeCount: z.number(),
});
export type LikeState = z.infer<typeof likeStateSchema>;

export const uploadTicketSchema = z.object({
  uploadId: z.string(),
  method: z.string(),
  uploadUrl: z.string(),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

export const uploadSchema = z.object({
  id: z.string(),
  status: z.string(),
  purpose: z.string(),
  url: z.string(),
  width: z.number(),
  height: z.number(),
});
export type Upload = z.infer<typeof uploadSchema>;

export const blockedUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
  blockedAt: z.string(),
});
export const blockedUserPageSchema = z.object({
  items: z.array(blockedUserSchema),
  nextCursor: z.string().nullish(),
});
export type BlockedUser = z.infer<typeof blockedUserSchema>;

export const reportCreatedSchema = z.object({ id: z.string(), status: z.string() });

export const reportSchema = z.object({
  id: z.string(),
  reporterId: z.string(),
  reporterUsername: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  details: z.string().nullish(),
  status: z.string(),
  targetStatus: z.string(),
  targetPreview: z.string().nullish(),
  createdAt: z.string(),
  resolvedBy: z.string().nullish(),
  resolvedAt: z.string().nullish(),
  // Patch 14: where the target is and who wrote it (all null when the target is gone).
  targetPostId: z.string().nullish(),
  targetAuthorId: z.string().nullish(),
  targetAuthorUsername: z.string().nullish(),
  targetAuthorStatus: z.string().nullish(),
});
export const reportPageSchema = z.object({
  items: z.array(reportSchema),
  nextCursor: z.string().nullish(),
});
export type Report = z.infer<typeof reportSchema>;
export type ReportPage = z.infer<typeof reportPageSchema>;

// Patch 14: staff listings. No email or token data in any of them.
export const staffPostSchema = z.object({
  id: z.string(),
  author: authorSchema,
  authorStatus: z.string(),
  content: z.string(),
  imageUrl: z.string().nullish(),
  status: z.string(),
  likeCount: z.number(),
  commentCount: z.number(),
  createdAt: z.string(),
});
export const staffPostPageSchema = z.object({ items: z.array(staffPostSchema), nextCursor: z.string().nullish() });
export type StaffPost = z.infer<typeof staffPostSchema>;

export const staffCommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: authorSchema,
  authorStatus: z.string(),
  content: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
export const staffCommentPageSchema = z.object({ items: z.array(staffCommentSchema), nextCursor: z.string().nullish() });
export type StaffComment = z.infer<typeof staffCommentSchema>;

export const staffUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
  role: roleSchema,
  status: z.string(),
  createdAt: z.string(),
});
export const staffUserPageSchema = z.object({ items: z.array(staffUserSchema), nextCursor: z.string().nullish() });
export type StaffUser = z.infer<typeof staffUserSchema>;
