import type { Comment, Me } from "../../api/schemas";

/** Only the comment's author and staff can delete a comment (the post's author cannot). */
export function canDeleteComment(comment: Comment, me: Me | undefined): boolean {
  if (!me) return false;
  return comment.author.id === me.id || me.role === "MODERATOR" || me.role === "ADMIN";
}
