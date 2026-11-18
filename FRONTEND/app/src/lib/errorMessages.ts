import { ApiError, ErrorCode } from "../api/errors";

/** A friendly message for errors that have no screen-specific wording. */
export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return "Something went wrong. Please try again.";
  if (e.isNetwork) return "Can’t reach the server. Check your connection and try again.";
  switch (e.code) {
    case ErrorCode.RateLimited:
      return e.retryAfter
        ? `Too many attempts. Please try again in ${formatWait(e.retryAfter)}.`
        : "Too many attempts. Please wait a moment and try again.";
    case ErrorCode.InternalError:
      return e.errorId
        ? `Something went wrong on our side. Reference: ${e.errorId}`
        : "Something went wrong on our side. Please try again.";
    case ErrorCode.PayloadTooLarge:
      return "That’s too large to send.";
    default:
      return e.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : "Something went wrong. Please try again.";
  }
}

export function formatWait(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  const m = Math.ceil(seconds / 60);
  return `${m} minutes`;
}

export function isRateLimited(e: unknown): e is ApiError {
  return e instanceof ApiError && (e.code === ErrorCode.RateLimited || e.status === 429);
}
