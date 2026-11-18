/** Every code the API can send (full enum from openapi.json). Branch on these. */
export const ErrorCode = {
  BadRequest: "BAD_REQUEST",
  ValidationFailed: "VALIDATION_FAILED",
  InvalidCursor: "INVALID_CURSOR",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  EmailNotVerified: "EMAIL_NOT_VERIFIED",
  InvalidToken: "INVALID_TOKEN",
  NotFound: "NOT_FOUND",
  Conflict: "CONFLICT",
  RateLimited: "RATE_LIMITED",
  InternalError: "INTERNAL_ERROR",
  PayloadTooLarge: "PAYLOAD_TOO_LARGE",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Fields of an RFC 9457 problem+json body that the app uses. */
export interface ProblemBody {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errorId?: string;
  errors?: { field?: string; message?: string }[];
}

export interface FieldError {
  field: string;
  message: string;
}

/** Every failed API call becomes one of these. Branch on `status` and `code`, never on `detail`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly detail: string | undefined;
  readonly fieldErrors: FieldError[];
  /** Seconds to wait, from the Retry-After header (429). */
  readonly retryAfter: number | undefined;
  readonly errorId: string | undefined;

  constructor(init: {
    status: number;
    message?: string;
    code?: string;
    detail?: string;
    fieldErrors?: FieldError[];
    retryAfter?: number;
    errorId?: string;
  }) {
    super(init.detail ?? init.message ?? `Request failed (${init.status})`);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? [];
    this.retryAfter = init.retryAfter;
    this.errorId = init.errorId;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function hasCode(e: unknown, code: string): boolean {
  return isApiError(e) && e.code === code;
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function errorFromResponse(res: Response): Promise<ApiError> {
  let body: ProblemBody = {};
  try {
    const text = await res.text();
    if (text) body = JSON.parse(text) as ProblemBody;
  } catch {
    /* not JSON: keep an empty body */
  }
  const fieldErrors: FieldError[] = (body.errors ?? [])
    .filter((e) => typeof e?.message === "string")
    .map((e) => ({ field: e.field ?? "", message: e.message as string }));
  return new ApiError({
    status: res.status,
    message: body.title,
    code: body.code,
    detail: body.detail,
    fieldErrors,
    retryAfter: parseRetryAfter(res.headers.get("Retry-After")),
    errorId: body.errorId,
  });
}
