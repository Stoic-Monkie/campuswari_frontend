import type { Me, Post, Report, StaffComment, StaffPost, StaffUser } from "../api/schemas";

export function makePost(over: Partial<Post> & { id: string }): Post {
  return {
    author: { id: "u-other", username: "other", displayName: "Other Person", avatarUrl: null },
    content: `Post ${over.id}`,
    imageUrl: null,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

export function makeMe(over: Partial<Me> = {}): Me {
  return {
    id: "u-me",
    email: "me@college.edu",
    username: "me",
    displayName: "Me Myself",
    bio: null,
    avatarUrl: null,
    role: "STUDENT",
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

export function makeReport(over: Partial<Report> & { id: string }): Report {
  return {
    reporterId: "u-rep",
    reporterUsername: "reporter",
    targetType: "POST",
    targetId: `t-${over.id}`,
    reason: "SPAM",
    details: null,
    status: "OPEN",
    targetStatus: "VISIBLE",
    targetPreview: `Reported text ${over.id}`,
    createdAt: new Date().toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    targetPostId: null,
    targetAuthorId: null,
    targetAuthorUsername: null,
    targetAuthorStatus: null,
    ...over,
  };
}

const staffAuthor = { id: "u-author", username: "author", displayName: "Author Person", avatarUrl: null };

export function makeStaffPost(over: Partial<StaffPost> & { id: string }): StaffPost {
  return {
    author: staffAuthor,
    authorStatus: "ACTIVE",
    content: `Hidden post ${over.id}`,
    imageUrl: null,
    status: "HIDDEN",
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

export function makeStaffComment(over: Partial<StaffComment> & { id: string }): StaffComment {
  return {
    postId: `p-${over.id}`,
    author: staffAuthor,
    authorStatus: "ACTIVE",
    content: `Hidden comment ${over.id}`,
    status: "HIDDEN",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

export function makeStaffUser(over: Partial<StaffUser> & { id: string }): StaffUser {
  return {
    username: over.id.replace("u-", ""),
    displayName: `Person ${over.id}`,
    avatarUrl: null,
    role: "STUDENT",
    status: "SUSPENDED",
    createdAt: "2026-02-01T00:00:00Z",
    ...over,
  };
}
