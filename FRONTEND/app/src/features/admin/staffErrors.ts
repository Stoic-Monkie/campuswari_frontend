import { ApiError } from "../../api/errors";
import { describeError } from "../../lib/errorMessages";

/** A message for a failed staff action. The server's refusals are specific, so say what they mean. */
export function staffActionError(e: unknown, action: "resolve" | "hide" | "unhide" | "suspend" | "reinstate"): string {
  if (e instanceof ApiError) {
    if (action === "resolve" && e.status === 409) return "Somebody already resolved this report.";
    if (e.status === 404) return "This item no longer exists.";
    if (action === "suspend" && e.status === 400) return "You can’t suspend yourself.";
    if (action === "suspend" && e.status === 403) return "Admins can’t be suspended.";
    if (e.status === 403) return "You don’t have permission to do that.";
  }
  return describeError(e);
}
