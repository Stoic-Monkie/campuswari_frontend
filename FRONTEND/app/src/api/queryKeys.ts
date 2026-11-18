/** One place for TanStack Query cache keys, so updates and invalidations always match. */
export const keys = {
  me: ["me"] as const,
  feed: ["feed"] as const,
  post: (id: string) => ["post", id] as const,
  commentsAll: ["comments"] as const,
  comments: (postId: string) => ["comments", postId] as const,
  blocks: ["blocks"] as const,
  /** All moderation queues share this prefix; the status is the second part. */
  adminReportsAll: ["admin-reports"] as const,
  adminReports: (status: string) => ["admin-reports", status] as const,
  adminHidden: ["admin-hidden"] as const,
  adminHiddenPosts: ["admin-hidden", "posts"] as const,
  adminHiddenComments: ["admin-hidden", "comments"] as const,
  adminUsersAll: ["admin-users"] as const,
  adminUsers: (status: string, q: string) => ["admin-users", status, q] as const,
  profile: (username: string) => ["profile", username] as const,
  /** All profile post lists share this prefix, so they can be updated together. */
  userPostsAll: ["user-posts"] as const,
  userPosts: (username: string) => ["user-posts", username] as const,
};
