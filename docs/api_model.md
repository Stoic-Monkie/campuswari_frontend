# CampusWari API model (frontend reference)

Field names, types and which fields are required come from `openapi.json`, generated from the real controllers and DTOs (Patch 12a, `scripts/export-openapi.sh`). Behaviour (status codes, limits, rules) comes from the patch logs, because the generated file does not carry it.

How to read the tags:

- **no tag**: field names and types are in `openapi.json`; behaviour is in the patch logs
- **[logs]**: behaviour taken from the patch logs, not visible in `openapi.json`. Check once against the running API
- **[check]**: not known from either source; listed in section 9

If this file and `openapi.json` disagree about a field name or type, `openapi.json` is right. Regenerate the types with `npx openapi-typescript docs/frontend/openapi.json -o src/api/schema.d.ts` and let the compiler find the difference.

Known limits of `openapi.json` (not bugs in the API):

- Every operation lists only `200` as its success status. The real statuses (201, 202, 204) are in the tables below **[logs]**. `200` here means "success", not a promise of the status number.
- Success bodies are declared as `*/*`; they are JSON.
- Enums are plain `string` (`purpose`, `status`, `targetType`, `reason`, `resolution`, `role`). Only `LoginRequest.delivery` is a real enum. The allowed values below come from the patch logs.
- Response fields are never marked required. In practice `id`, `createdAt` and counts are always present; `avatarUrl`, `bio`, `imageUrl`, `details`, `refreshToken`, `nextCursor`, `resolvedBy`, `resolvedAt` and the four report `target*` fields of section 8 can be **null or absent**: treat both the same.
- Dates are `date-time` strings; ids are `uuid` strings.
- Last checked against `openapi.json` exported after Patch 14 (2026-11-16): section 8 now covers the three staff listings and the four `ReportResponse` target fields.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api` (dev: Vite proxy to `http://localhost:8080`) |
| Content type | `application/json` both ways; errors are `application/problem+json` |
| Auth header | `Authorization: Bearer <accessToken>` on everything except the public auth endpoints |
| Unknown JSON fields | **Rejected with 400.** Send only documented fields |
| Pagination | Keyset: `?cursor=&limit=` returns `{ items, nextCursor }`; `nextCursor` is null on the last page. `limit` default 20, max 50 (larger is capped; below 1 or not a number is 400). Cursors are opaque; a bad one is 400 `INVALID_CURSOR` [logs] |
| Text | Stored raw after cleaning. Render as plain text only |
| CORS | Exact origins, credentials allowed. Cookie requests also need an allow-listed `Origin` header |
| Rate limits | 429 with `Retry-After` (seconds) |
| Body size | JSON over 64 KB gives 413 |

### Public endpoints (no bearer token)

Exactly these eight, marked `security: []` in `openapi.json`: `POST /api/auth/register`, `login`, `refresh`, `logout`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`. Everything else, including `POST /api/auth/logout-all`, needs a token.

### Limits: two layers

Request DTOs have a **coarse** limit (visible in `openapi.json`, only a guard against huge payloads) and the service enforces the **real** limit after cleaning. Validate in the UI against the real one.

| Field | Real limit [logs] | Coarse limit in `openapi.json` |
|---|---|---|
| post `content` | 1 to 2000 characters (Unicode characters, not bytes) | 8000 |
| comment `content` | 1 to 1000 characters | 4000 |
| `displayName` (profile) | 60 | 200 |
| `bio` | 300 (empty string clears it) | 1000 |
| register `username` | 3 to 30, `[a-z0-9_]`, no leading, trailing or double underscore, reserved names refused | 60 |
| register `displayName` | 60 | 200 |
| register `password` | 10 to 128, not a common password, not containing the username, email local part or name | none |
| report `details` | 500 | 2000 |
| `email` | allowed college domain | 254 |

---

## 2. Errors

Every error is `application/problem+json`. All operations point at this one schema (`default` response).

```ts
interface Problem {
  type?: string;      // urn:campuswari:problem:...
  title?: string;
  status?: number;
  detail?: string;    // human text; never branch on it
  instance?: string;  // request path
  code?: ErrorCode;   // BRANCH ON THIS
  errors?: { field: string; message: string }[]; // only VALIDATION_FAILED
  errorId?: string;   // only INTERNAL_ERROR; quote it to support
}
type ErrorCode =
  | "BAD_REQUEST" | "VALIDATION_FAILED" | "INVALID_CURSOR" | "UNAUTHORIZED" | "FORBIDDEN"
  | "EMAIL_NOT_VERIFIED" | "INVALID_TOKEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED"
  | "INTERNAL_ERROR" | "PAYLOAD_TOO_LARGE";
```

The list above is the full enum from `openapi.json`. `docs/frontend/errors.md` has the usual status and the frontend behaviour for every code, and the shape of the validation list. Short version:

| Code | Status | Frontend behaviour |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Show `errors[]` per field. Service-level failures (weak password, "nothing to update") have **no** `errors`, only `detail`: handle both |
| `BAD_REQUEST` | 400 | Unreadable JSON, wrong types or an unknown field. Generic message |
| `INVALID_CURSOR` | 400 | Restart from the first page |
| `INVALID_TOKEN` | 400 | Verify or reset link wrong, used or expired: offer to resend |
| `UNAUTHORIZED` | 401 | No or bad token, bad login, suspended, failed refresh. Try one refresh, then go to login |
| `EMAIL_NOT_VERIFIED` | 403 | Show the "check your email" screen |
| `FORBIDDEN` | 403 | Hide the action; generic message |
| `NOT_FOUND` | 404 | Generic "not found". Also used for hidden and blocked content; never reveal a block |
| `CONFLICT` | 409 | Resolving an already resolved report: refresh the queue |
| `PAYLOAD_TOO_LARGE` | 413 | Generic error |
| `RATE_LIMITED` | 429 | Disable the control for `Retry-After` seconds |
| `INTERNAL_ERROR` | 500 | Show `errorId` |

---

## 3. Auth

```ts
interface RegisterRequest { email: string; username: string; displayName: string; password: string } // all required
interface LoginRequest { email: string; password: string; delivery?: "BODY" | "COOKIE" }              // default BODY; the web app uses COOKIE
interface EmailRequest { email: string }
interface TokenRequest { token: string }                        // max 200 chars
interface ResetPasswordRequest { token: string; password: string }
interface RefreshRequest { refreshToken?: string }              // body is optional; the cookie is used if absent
interface MessageResponse { message: string }
interface AuthResponse {
  accessToken: string;
  tokenType: string;        // "Bearer"
  expiresIn: number;        // seconds, about 900
  refreshToken?: string | null;   // null/absent when delivery is COOKIE
}
```

| Method | Path | Success | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | 202 `MessageResponse` [logs] | Same response whether or not the email exists. Never show "email already used". A taken **username** may be reported (usernames are public). Limits: 3 per hour per email, 20 per hour per address |
| POST | `/api/auth/login` | 200 `AuthResponse` | With COOKIE also `Set-Cookie: cw_refresh=...`. 401 for wrong password, unknown user, suspended or locked (identical on purpose). 403 `EMAIL_NOT_VERIFIED` for a correct password on an unverified account. 400 for an untrusted `Origin` with COOKIE. 10 per 15 min per email |
| POST | `/api/auth/refresh` | 200 `AuthResponse` | Reads the `cw_refresh` cookie, else the body. **The old refresh token dies on use.** Every failure is the same 401 and clears the cookie. Reusing a spent token revokes the whole session family. Needs an allow-listed `Origin` when the cookie is used |
| POST | `/api/auth/logout` | 204 [logs] | Always succeeds; revokes this login and clears the cookie |
| POST | `/api/auth/logout-all` | 204 [logs] | Bearer token required. Voids all other sessions |
| POST | `/api/auth/verify-email` | 200 `MessageResponse` | 400 `INVALID_TOKEN` |
| POST | `/api/auth/resend-verification` | 202 `MessageResponse` [logs] | Always the same response (60 s cooldown applied silently) |
| POST | `/api/auth/forgot-password` | 202 `MessageResponse` [logs] | Always the same response |
| POST | `/api/auth/reset-password` | 200 `MessageResponse` | 400 `INVALID_TOKEN`; 400 `VALIDATION_FAILED` for a weak password (the link stays valid). Success ends all sessions and marks the email verified |

Registering an **unverified** email again replaces the old registration and sends a fresh link. The email links open a frontend page that POSTs the token (a GET link would be burned by mail scanners). **The page path and the query parameter name in the emailed link are [check]** (`MailTemplates.java`).

---

## 4. Users

```ts
interface AuthorResponse { id: string; username: string; displayName: string; avatarUrl?: string | null }

interface MeResponse {
  id: string; email: string; username: string; displayName: string;
  bio?: string | null; avatarUrl?: string | null;
  role: "STUDENT" | "MODERATOR" | "ADMIN";    // string in openapi.json; values from the logs
  emailVerified: boolean;
  createdAt: string;
}
interface UserProfileResponse {               // no email, role or status
  id: string; username: string; displayName: string;
  bio?: string | null; avatarUrl?: string | null; createdAt: string;
}
interface UpdateProfileRequest {              // all optional
  displayName?: string; bio?: string; avatarUploadId?: string;
}
```

| Method | Path | Result |
|---|---|---|
| GET | `/api/users/me` | `MeResponse`. `role` is what the admin UI should read |
| PATCH | `/api/users/me` | `MeResponse`. Missing or null field = unchanged. Any other field (role, email, username, status) is 400 |
| GET | `/api/users/{username}` | `UserProfileResponse` (has `id`, which block and report need). 404 for unknown, suspended, deleted, reserved, **or blocked either way** |
| GET | `/api/users/{username}/posts?cursor=&limit=` | `PostPageResponse`; same 404 rules |

---

## 5. Posts, feed, comments, likes

```ts
interface PostResponse {
  id: string; author: AuthorResponse; content: string; imageUrl?: string | null;
  likeCount: number; commentCount: number; likedByMe: boolean; createdAt: string;
}
interface PostPageResponse { items: PostResponse[]; nextCursor?: string | null }
interface CreatePostRequest { content: string; imageUploadId?: string }   // content required

interface CommentResponse { id: string; postId: string; author: AuthorResponse; content: string; createdAt: string }
interface CommentPageResponse { items: CommentResponse[]; nextCursor?: string | null }
interface CreateCommentRequest { content: string }                        // required

interface LikeStateResponse { likedByMe: boolean; likeCount: number }
```

| Method | Path | Result / rules |
|---|---|---|
| POST | `/api/posts` | 201 `PostResponse` + `Location` [logs]. Verified email. 10 per 10 min |
| GET | `/api/posts?cursor=&limit=` | Feed, **newest first** |
| GET | `/api/posts/{id}` | `PostResponse`; 404 if missing, deleted, hidden, blocked, or author inactive |
| DELETE | `/api/posts/{id}` | 204 [logs]. Author or staff. Other student: 403 (visible) or 404 (hidden or blocked) |
| PUT | `/api/posts/{id}/like` | 200 `LikeStateResponse`. Idempotent. Verified email. 120 per 10 min, shared with unlike |
| DELETE | `/api/posts/{id}/like` | 200 `LikeStateResponse`. Idempotent |
| POST | `/api/posts/{postId}/comments` | 201 `CommentResponse` [logs], no `Location`. 20 per 10 min |
| GET | `/api/posts/{postId}/comments?cursor=&limit=` | **Oldest first**. 404 if the post is not visible |
| DELETE | `/api/comments/{id}` | 204 [logs]. Comment author or staff only (not the post's author) |

`likeCount` and `commentCount` are global; with blocks the visible list can be shorter than `commentCount`. No edit, no replies, no comment likes.

---

## 6. Uploads (images)

```ts
type UploadPurpose = "POST_IMAGE" | "AVATAR";
interface CreateUploadRequest { purpose: UploadPurpose; contentType: "image/jpeg" | "image/png"; size: number }  // all required
interface UploadTicketResponse {
  uploadId: string; method: "PUT"; uploadUrl: string;
  headers: Record<string, string>;     // send EXACTLY these
  expiresAt: string;
}
interface UploadResponse {
  id: string; status: "PENDING" | "READY" | "ATTACHED" | "REJECTED";
  purpose: UploadPurpose; url: string; width: number; height: number;
}
```

1. `POST /api/uploads` returns `UploadTicketResponse` (201 [logs]). Verified email only. 30 calls per hour across both upload endpoints.
2. `PUT <uploadUrl>` straight to R2 with the file as the body and exactly the returned `headers`. **Not** through `/api`, **no** bearer token.
3. `POST /api/uploads/{id}/complete` returns `UploadResponse` (200, idempotent). 400 if the object is not there yet (retry) or the file was rejected (final).
4. Use the `uploadId` once as `imageUploadId` (post) or `avatarUploadId` (profile). Any bad claim (not yours, not ready, used, wrong purpose) is one generic 400.

Limits: JPEG or PNG only, 5 MB, 25 megapixels, resized to at most 2048 px, metadata removed. The ticket lasts about 5 minutes, the slot about 15.

---

## 7. Blocks and reports

```ts
interface BlockedUserResponse { id: string; username: string; displayName: string; avatarUrl?: string | null; blockedAt: string }
interface BlockedUserPageResponse { items: BlockedUserResponse[]; nextCursor?: string | null }

type ReportTarget = "POST" | "COMMENT" | "USER";
type ReportReason = "SPAM" | "HARASSMENT" | "HATE" | "NSFW" | "IMPERSONATION" | "OTHER";
interface CreateReportRequest { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }
interface ReportCreatedResponse { id: string; status: string }
```

| Method | Path | Result |
|---|---|---|
| PUT | `/api/users/{id}/block` | 204 [logs]. `{id}` is a **user id** (uuid), not a username. Idempotent. Self is 400; unknown, suspended or deleted is 404. 60 per 10 min |
| DELETE | `/api/users/{id}/block` | 204 [logs]. Idempotent, any id |
| GET | `/api/users/me/blocks?cursor=&limit=` | `BlockedUserPageResponse`, newest first |
| POST | `/api/reports` | `ReportCreatedResponse`: **201 new, 200 if already reported** (the original id) [logs]. Verified email. Self-report of a user is 400. 20 per hour |

Block is both ways and invisible: the other person's content is simply 404 or absent. Nothing says whether you blocked a given person, so to show Block or Unblock, fetch `/api/users/me/blocks` once and compare ids **[check]**.

---

## 8. Staff (moderator and admin)

Role is checked against the database on every call. All routes are under `/api/admin`. A student gets 403; a suspended staff member gets 401.

```ts
type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
type ReportResolution = "ACTIONED" | "DISMISSED";
interface ResolveReportRequest { resolution: ReportResolution }          // required
interface ReportResponse {
  id: string;
  reporterId: string; reporterUsername: string;      // NOT a nested author object
  targetType: ReportTarget; targetId: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  targetStatus: string;                              // the target's current status
  targetPreview?: string | null;                     // up to 200 chars
  createdAt: string;
  resolvedBy?: string | null; resolvedAt?: string | null;
  // Patch 14: where the target is and who wrote it. All four are null/absent when the target no longer exists
  targetPostId?: string | null;                      // POST report: the post. COMMENT report: the comment's post. USER report: null
  targetAuthorId?: string | null;                    // POST/COMMENT: the author of the post or comment. USER: the reported person
  targetAuthorUsername?: string | null;
  targetAuthorStatus?: "ACTIVE" | "SUSPENDED" | null; // live status; string in openapi.json
}
interface ReportPageResponse { items: ReportResponse[]; nextCursor?: string | null }

// Patch 14 listings. No email, password or token data in any of them.
interface StaffPostResponse {
  id: string; author: AuthorResponse;
  authorStatus: "ACTIVE" | "SUSPENDED";               // the author's account, so the screen can offer Suspend or Reinstate
  content: string; imageUrl?: string | null;
  status: "HIDDEN";                                   // string in openapi.json
  likeCount: number; commentCount: number; createdAt: string;
}
interface StaffCommentResponse {
  id: string; postId: string; author: AuthorResponse;
  authorStatus: "ACTIVE" | "SUSPENDED";
  content: string; status: "HIDDEN"; createdAt: string;
}
interface StaffUserResponse {
  id: string; username: string; displayName: string; avatarUrl?: string | null;
  role: "STUDENT" | "MODERATOR" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; createdAt: string;
}
interface StaffPostPageResponse { items: StaffPostResponse[]; nextCursor?: string | null }
interface StaffCommentPageResponse { items: StaffCommentResponse[]; nextCursor?: string | null }
interface StaffUserPageResponse { items: StaffUserResponse[]; nextCursor?: string | null }
```

| Method | Path | Who | Result |
|---|---|---|---|
| GET | `/api/admin/reports?status=&cursor=&limit=` | Moderator, admin | Queue, **oldest first**, `status` defaults to `OPEN`. Each row also carries the four `target*` fields above |
| GET | `/api/admin/posts?status=&cursor=&limit=` | Moderator, admin | `StaffPostPageResponse`: hidden posts, **newest first**. `status` is `HIDDEN` (the default; any case); anything else is 400 `VALIDATION_FAILED` [logs] |
| GET | `/api/admin/comments?status=&cursor=&limit=` | Moderator, admin | `StaffCommentPageResponse`: hidden comments, newest first. Same `status` rule [logs] |
| GET | `/api/admin/users?status=&q=&cursor=&limit=` | **Admin only** (moderators get 403) | `StaffUserPageResponse`: accounts, **newest account first**. `status` is `SUSPENDED` (default) or `ACTIVE`; `DELETED` or anything else is 400. `q` is an optional username **prefix** search, case-insensitive, 2 to 30 characters (shorter or longer is 400; blank is ignored; `%` and `_` are plain characters) [logs] |
| POST | `/api/admin/reports/{id}/resolve` | Moderator, admin | 204 [logs]; 409 if already resolved |
| POST | `/api/admin/posts/{id}/hide` and `/unhide` | Moderator, admin | 204 [logs], idempotent; 404 if deleted or unknown |
| POST | `/api/admin/comments/{id}/hide` and `/unhide` | Moderator, admin | 204 [logs], idempotent |
| POST | `/api/admin/users/{id}/suspend` and `/reinstate` | **Admin only** | 204 [logs], idempotent. Cannot suspend yourself (400) or an admin (403) |

The three listings are reads: not audited, and a hidden item or suspended account shows up in them as soon as it is hidden or suspended and leaves as soon as it is unhidden or reinstated. Paging is the usual `{ items, nextCursor }`; a bad cursor is 400 `INVALID_CURSOR`, and `limit` below 1 is 400. A hidden post or comment is listed together with its author's status, so a screen can offer Unhide and Suspend or Reinstate from one row without a second call. To act on a report's target use `targetPostId` (open the post of a reported comment), `targetAuthorId` (link to or suspend the author) and `targetAuthorUsername` (link to `/api/users/{username}`, which is 404 for a suspended person, so show the username without a link when `targetAuthorStatus` is `SUSPENDED`).

---

## 9. Still to check against the running API

Everything that used to be a guess about field names is settled by `openapi.json`. What is left:

- [ ] **Success status codes.** `openapi.json` says 200 everywhere; the logs say 201, 202 and 204 in the places marked [logs]. Confirm with `curl -i` once (register, create post, delete post, logout, block).
- [ ] **Path and query name of the emailed verification and reset links** (`MailTemplates.java`). The frontend routes must match.
- [ ] **Cookie details** for the web login: name `cw_refresh`, path, `SameSite`, `Secure` (`RefreshCookies.java`, Patch 4b log) and what the dev proxy needs.
- [ ] **Enum value sets** (`role`, `purpose`, `status`, `targetType`, `reason`, `resolution`, report `status`): taken from the logs, plain strings in `openapi.json`. Consider `@Schema(allowableValues = ...)` or real enums in the DTOs so the generated types are exact (Patch 12a loose end).
- [ ] **Null versus absent** for optional response fields (for example does `imageUrl` disappear or come back `null`)? The client should accept both.
- [ ] **Blocked-state of a profile** is not returned (section 7).
- [ ] Capture real error bodies into `docs/frontend/error-samples.md` with the commands in `errors.md`.

If a shape here is wrong after that, only the typed client (`src/api/schema.d.ts`) and the thin wrapper in `FRONTEND/src/api/` should need to change.
