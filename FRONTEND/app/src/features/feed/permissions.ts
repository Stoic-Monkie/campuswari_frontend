import type { Me, Post } from "../../api/schemas";

/** Authors and staff can delete a post. The server makes the final decision. */
export function canDeletePost(post: Post, me: Me | undefined): boolean {
  if (!me) return false;
  return post.author.id === me.id || me.role === "MODERATOR" || me.role === "ADMIN";
}
