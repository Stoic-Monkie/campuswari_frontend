import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiError, ErrorCode } from "../../api/errors";

/**
 * Put the API's per-field validation errors on the matching inputs.
 * Returns true if at least one was placed.
 */
export function applyFieldErrors<T extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<T>,
  known: readonly string[],
): boolean {
  if (!(e instanceof ApiError) || e.code !== ErrorCode.ValidationFailed) return false;
  let placed = false;
  for (const fe of e.fieldErrors) {
    if (known.includes(fe.field)) {
      setError(fe.field as FieldPath<T>, { type: "server", message: fe.message });
      placed = true;
    }
  }
  return placed;
}

/** For 400/409 failures with no field list: the server's own text is meant for people. */
export function serverDetail(e: unknown): string | undefined {
  if (!(e instanceof ApiError)) return undefined;
  if (e.status === 400 || e.status === 409) return e.detail;
  return undefined;
}
