import type { Me } from "../../api/schemas";

/** Moderators and admins. The server checks the role on every staff call; this only decides what to show. */
export function isStaff(me: Pick<Me, "role"> | undefined): boolean {
  return me?.role === "MODERATOR" || me?.role === "ADMIN";
}

export function isAdmin(me: Pick<Me, "role"> | undefined): boolean {
  return me?.role === "ADMIN";
}
