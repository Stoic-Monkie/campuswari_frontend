# Frontend integration: issues and quirks

Written 2026-11-09, before starting the frontend (React + TypeScript + Vite). Status update added 2026-11-12 (see next section).
Source: `docs/PLAN.md`, `docs/dev_log/status.md`, the patch logs 00 to 11b and `docs/RUNBOOK.md`.
The controller and DTO source code was **not** read. Anything marked *unverified* comes from the patch logs only and should be checked against the code.

Legend: **Sev** = how much it matters (High / Med / Low). **Who** = where the fix belongs (API, Frontend, Ops, Docs).

---

## Status update (2026-11-12)

The frontend has reached M3 (auth screens, feed, posting). `openapi.json` was added to `docs/frontend/` and the owner confirmed login and sessions work in the browser (Brave, which is Chromium). What that changed:

| ID | Status | Note |
|---|---|---|
| A1 | **Confirmed in Chromium** | Cookie login, refresh and logout work through the Vite proxy. Firefox and Safari are still untested. |
| A2 | **Probably fine, unconfirmed in code** | The app expects `/verify-email?token=` and `/reset-password?token=`. The owner reports the flows work; still read `MailTemplates.java` and write the real format into `api_model.md`. |
| A3 | **Resolved** | The dev origin `http://localhost:5173` is in the local CORS list and the proxy forwards `Origin`. |
| A4 | **Works in Chromium** | `Secure` cookie on `http://localhost` is accepted. Safari and Firefox untested. |
| A5 | **Mostly resolved** | The full `ErrorCode` enum is known (below). The exact validation field-list body is assumed to be `errors: [{field, message}]`; the app also copes with a plain `detail`. Verify with the `curl` in the A5 row. |
| A6 | **Mostly confirmed** | Storage is a local **SILO** server (patch 13). A profile photo and a post photo both work end to end. Still to check: that the private bucket empties after processing, and a photo taken on a phone (rotation, HEIC). Details in `docs/frontend/storage-setup.md`. |
| A7 | **Answered** | Local development uses SILO instead of `memory` mode; no dependence on any paid service. |
| B1 | Open, handled in the UI | The app shows field errors when a list exists and the server's `detail` otherwise. |
| B2 | Open | A lost refresh response signs the user out and sends them to the login screen with no explanation yet. The UI should show a "you were signed out" message. |
| B8 | **Resolved** | `UserProfileResponse` has `id`; `MeResponse` has `role` and `emailVerified`. No API change needed. |
| B10 | **Handled in the frontend (M6)** | Photos are converted to JPEG in the browser before upload, so HEIC and WebP work where the browser can read them. |

Known error codes: `BAD_REQUEST`, `VALIDATION_FAILED`, `INVALID_CURSOR`, `UNAUTHORIZED`, `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `INVALID_TOKEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `PAYLOAD_TOO_LARGE`. Note the rate-limit code is `RATE_LIMITED`.

New items found while building:

| ID | Sev | Who | Issue | Suggested fix |
|---|---|---|---|---|
| N1 | Med | API / Docs | **Text limits disagree.** `openapi.json` says post 8000, comment 4000, display name 200, bio 1000, report details 2000, username 60. The patch logs say 2000, 1000, 60, 300, 500, 30. The UI uses the patch-log numbers (`FRONTEND/app/src/lib/limits.ts`). | Confirm what the service enforces after cleaning; if the DTO numbers are only guards, say so in the DTO comments. Either way keep both sets in sync. |
| N2 | Low | API | **The OpenAPI spec marks no response field as required and no nullability,** so generated types would be all-optional. The app hand-writes its Zod schemas and accepts null or missing for optional fields. | Add `@Schema(requiredMode = REQUIRED)` (or non-null annotations) to response records if you want generated types later. |
| N3 | Low | API | **No "new posts since X" endpoint.** The feed is keyset paged from the top, so the app can only reload from the first page (refresh button). | Fine for v1. A `?after=` or a count endpoint could drive a "new posts" pill later. |
| N4 | Low | Frontend | **No proactive token refresh yet.** The client refreshes only after a 401. It works (single-flight, tested) but costs one extra round trip every 15 minutes. | Add a timer and tab-focus refresh in M9 polish. |
| N5 | Low | API / UX | **No way to remove a profile photo and no photo descriptions.** `PATCH /api/users/me` accepts only a new `avatarUploadId`, and posts carry no alt text. | Add `avatarUploadId: null` handling or a DELETE; add an optional `imageAlt` to posts. |
| N6 | Low | Frontend | **Photos are converted to JPEG in the browser.** Animated GIFs become a still frame and transparent PNGs get a white background. | Acceptable for v1; mention in the UI if students ask. |
| N7 | **Resolved** | API | The backend already builds both the S3 client and the presigner with path-style addressing, so a local S3-compatible server needs configuration only (patch 13). |
| N8 | Low | API / UX | **Unblocking is only possible from Settings.** A blocked person's profile answers 404 (by design, blocks are invisible), so there is no "Unblock" button on their profile. | Fine for v1; the blocked list in Settings is the one place. |
| N9 | **Resolved** by backend patch 14 (hidden-content and suspended-account listings) and frontend M8b (the Hidden and People sections). |
| N10 | **Resolved** by backend patch 14 (`targetPostId`, `targetAuthorId`, `targetAuthorUsername`, `targetAuthorStatus` on reports) and frontend M8b (richer report cards). |

---

## Part 1: Issues to fix later

### A. Needs confirming before or during frontend work

| ID | Sev | Who | Issue | Suggested fix |
|---|---|---|---|---|
| A1 | High | API | **Cookie login flow never tested in a real browser.** Only MockMvc tests exist (status.md loose end; patch 4b). | Test login, refresh, logout with the real frontend first thing. |
| A2 | High | API | **Email link paths are unknown to the frontend.** Verification and reset emails link to `app.mail.frontend-base-url`, but the exact path and query format (`/verify-email?token=...`?) is in `MailTemplates`, which was not read. | Read `MailTemplates.java`, then match the frontend routes to it (or the other way round). Document the final paths here. |
| A3 | High | API | **Origin check vs the dev server.** Cookie login and refresh require an allow-listed `Origin`; a missing `Origin` counts as untrusted (patch 4b). The Vite dev proxy must forward a correct `Origin`, and the dev origin (for example `http://localhost:5173`) must be in the `local` profile's CORS list. `prod` rejects `http` and `localhost` origins on purpose. | Add the dev origin to `application-local.yaml` only. Check the proxy sends `Origin`. |
| A4 | Med | API | **`Secure` cookie on plain `http://localhost`.** Chromium and Firefox generally accept it on localhost; Safari may not. *Unverified.* | Test in Safari; if it fails, develop with a Cloudflare quick tunnel (RUNBOOK section 4) or use Chrome. |
| A5 | Med | API | **Exact error shapes not captured.** The full `ErrorCode` list, and the `VALIDATION_FAILED` body (field list) have not been seen. | Run `curl -s -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' -d '{}'`, and paste `ErrorCode.java`. Save the samples under `docs/frontend/`. |
| A6 | Med | API | **R2 upload path untested** (status.md, patch 10). The browser PUT needs CORS on the **incoming** bucket (allow `PUT` from the frontend origin, with the `Content-Type` header). | Do the R2 smoke test in the patch 10 log before building the upload UI. |
| A7 | Med | API | **No way to upload in local dev.** `app.media.mode: memory` stores nothing, so a real client cannot upload (patch 10). | Use a real R2 bucket pair for dev, or add a dev-only storage that really serves files. |
| A8 | Low | API | **Dev profile check.** `application.yaml` may default to the `local` profile (status.md, last loose end). | Confirm no default `spring.profiles.active` in the committed file. |
| A9 | Low | Ops | `GET /actuator/health` on port 8080 returns 404. This is expected: health is on port 8081 and may need `spring-boot-starter-actuator` (status.md: "Confirm actuator chain behaviour on port 8081"). | Verify `curl localhost:8081/actuator/health`. |

### B. API gaps that affect the UI

| ID | Sev | Who | Issue | Suggested fix |
|---|---|---|---|---|
| B1 | Med | API | **Validation error shape is inconsistent.** Bean-validation errors give a field list; service-level checks give a single `detail` string (patch 3 and status.md). The frontend needs two code paths. | Unify to a field list, with an optional `field` on service errors. |
| B2 | Med | API | **A refresh retried after a lost response logs the user out.** There is no grace window (patch 4b and status.md). On flaky campus Wi-Fi this will happen. | Add a short grace window (a few seconds) that returns the same new pair, or accept it and make the frontend show a clear "signed out" message. |
| B3 | Med | API | **No read path for your own hidden post.** A hidden post is 404 for everyone, including its author, who can still delete it (patch 7). The author is never told. | Add a "my posts" view that includes status, plus a notification or reason when staff hide something. |
| B4 | Med | API | **Moderation has no reasons or history.** No reason stored for hide or suspend, the user is not told, no appeal, no endpoint to list past actions or staff (patch 9b). | Store a reason, add `GET /api/admin/actions`, tell the user. |
| B5 | Med | API | **No admin or role management.** First admin and moderators are set by SQL. A CLI is planned (status.md). The admin UI cannot promote anyone. | Build the planned admin CLI. |
| B6 | Low | API | **Counts vs lists can disagree.** With blocks, a viewer may see `commentCount: 3` but only 2 comments. Comments and likes from suspended users stay in the counts (patches 8 and 9a). | Document in the UI (do not "fix" it by hiding counts), or compute per-viewer counts. |
| B7 | Low | API | **Reports.** You can report your own post or comment. Hiding content does not close its other reports; staff close each one (patch 9b and status.md). | Refuse self-reports; auto-close sibling reports on hide. |
| B8 | Low | API | **Profile lookup is by username, but block, report and suspend use user id.** Works because `AuthorResponse` carries both, but the UI must keep the id from the profile or post. *Unverified:* confirm `UserProfileResponse` includes `id`. | Confirm the field; if missing, add it. |
| B9 | Low | API | **An access token issued in the same second as logout-all or a password reset survives up to 15 minutes** (patches 4b, 5b). | Accept, or compare with `>=`. |
| B10 | Low | API | **Only JPEG and PNG, one image per post, no alt text.** Phone photos may arrive as HEIC or WebP and would be rejected; CMYK JPEGs are refused (patch 10). | Convert to JPEG in the browser before upload, or add WebP/HEIC support server-side. |
| B11 | Low | API | **Rate limits are in memory and per instance;** the defaults are guesses, and one campus NAT address can hit per-IP limits for many students (patch 6, status.md). Per-account limits exist on posts (10 per 10 min), comments (20 per 10 min), likes (120 per 10 min), uploads (30 per hour), reports (20 per hour), blocks (60 per 10 min). | Tune from real traffic. The frontend must handle 429 with `Retry-After`. |

### C. Security and housekeeping items from status.md that touch the frontend work

| ID | Sev | Who | Item |
|---|---|---|---|
| C1 | **High** | Ops | **Revoke the Gmail app password that was pasted into a chat** and was put in `application-local.yaml`; create a new one (status.md). |
| C2 | Med | Ops | Send one real email through Gmail SMTP by hand; the verification flow depends on it. |
| C3 | Med | Ops | Run the Docker stack end to end (RUNBOOK section 10), including backup **and restore**. |
| C4 | Low | Ops | Pin the `cloudflared` image version (currently `latest`). |
| C5 | Low | Ops | Set `TRUSTED_PROXIES` correctly, and check the audit log shows the real client address. |
| C6 | Low | Docs | Root `compose.yaml` and `zip/` are still in the repo tree; `startup-kit/Docker/env` duplicates `deploy/.env.example`. |
| C7 | Low | API | Patch 11c (OpenAPI, `kid` key rotation, `SECURITY.md`) is still pending. **OpenAPI would let the frontend generate its TypeScript types** instead of hand-writing them. |

---

## Part 2: Quirks the frontend must respect (intentional behaviour)

These are by design. They are not bugs, but they decide how the UI is built.

### Auth and session

1. **Access token lives in memory only.** It lasts 15 minutes. On every page load the app calls `POST /api/auth/refresh` to restore the session.
2. **Use `"delivery": "COOKIE"` on login** so the refresh token is an httpOnly cookie (`cw_refresh`, `SameSite=Strict`, `Secure`, `Path=/api/auth`). The response then has `refreshToken: null`. Requests that use the cookie must send `credentials: "include"`.
3. **Refresh tokens rotate and are single-use.** Never send two refreshes at once: the second counts as token reuse and revokes the whole session. The API client needs a single-flight refresh lock, and all requests that get a 401 must wait on it.
4. **A failed refresh clears the cookie** and returns the same 401 for every reason. Treat it as "signed out".
5. **`POST /api/auth/logout` always returns 204;** `logout-all` needs a bearer token.
6. **Register always returns 202** with a fixed message, whether or not the email exists. Never show "email taken". Usernames are public, so "username not available" is allowed.
7. **Unverified accounts cannot log in.** Correct password gives 403 `EMAIL_NOT_VERIFIED`; a wrong password gives the generic 401. The UI needs a "check your email" screen with a resend button. Resend always returns 202, and a 60 s cooldown is applied silently.
8. **Registering again with an unverified email replaces the old registration** (latest wins), and sends a fresh link.
9. **Unverified accounts are deleted after 7 days** by the nightly job. Say so on the "check your email" screen.
10. **Verification and reset links are consumed by a POST** from a page in the app. The page must read the token from the URL and post it (not rely on a GET).
11. **A weak new password does not burn the reset link;** the user can retry. A successful reset ends all sessions and marks the email verified.
12. **Password rules:** 10 to 128 characters, common passwords refused, and the username, email local part and name are rejected as context words. The password field is `@NotNull` only on the server, so the client should show the rules.
13. **Lockout is hidden.** A locked account returns the same 401 as a wrong password, so the UI cannot say "account locked".
14. **Suspended or deleted accounts get 401** (not 403) on any call, and the session is dead; staff routes also give 401 for a suspended moderator.

### Errors and limits

15. Every error is `application/problem+json`: `{type, title, status, detail, instance, ...}` with a stable code. Branch on the code, never on the `detail` text.
16. **429** includes `Retry-After` (seconds). Show it, and disable the button until it passes.
17. **413** if a body is over 64 KB. Posts are far below that.
18. **400 `INVALID_CURSOR`** means a bad cursor; restart from the first page.
19. Unknown JSON fields are rejected with 400, so the client must send only documented fields.

### Content

20. **Text is stored raw.** Render user text as plain text only (React does this by default; never use `dangerouslySetInnerHTML`). Keep line breaks (`\n`) with `white-space: pre-wrap`.
21. **Limits (patch-log values; see status update N1):** post 2000 characters, comment 1000, display name 60, bio 300, report details 500. Counted as Unicode characters (code points), not UTF-16 units. A JS `string.length` overcounts emoji, so count with `[...text].length`.
22. **Text is cleaned server-side** (spaces collapsed, control, bidi and zero-width characters rejected). The returned text may differ slightly from what was typed, so use the response, not the draft.
23. **Feed is newest-first keyset paging:** `{items, nextCursor}`; `nextCursor` is `null` on the last page. `limit` default 20, max 50. New posts never appear mid-session; refresh from the top (pull-to-refresh).
24. **Comments are oldest-first and flat.** No replies, no edit, no likes on comments.
25. **Likes return the new state** (`{likedByMe, likeCount}`) from both `PUT` and `DELETE`, and both are idempotent. Use that response instead of guessing. The API never says who liked a post.
26. **No edit for posts, comments or profile text after posting, except `PATCH /api/users/me`** (display name, bio, `avatarUploadId`). Missing or null means unchanged; an empty `bio` clears it.
27. **Invisible blocks.** Blocked content (either direction) is a plain 404, the same as a missing thing. The UI must not say "you are blocked". The only list is `GET /api/users/me/blocks`, and it never shows who blocked you. Once blocked, the person's profile is hidden from you too, so unblocking happens from that list.
28. **Delete rules:** only the author or staff can delete. A non-author gets 403 on a visible item and 404 on a hidden one. The author of a post cannot delete comments on it.
29. **Likes, comments, posts and reports need a verified email;** blocking does not.
30. **Report:** 201 new, 200 if already reported (the original is returned). Reasons: `SPAM`, `HARASSMENT`, `HATE`, `NSFW`, `IMPERSONATION`, `OTHER`. Targets: `POST`, `COMMENT`, `USER`.

### Images

31. **Three steps:** `POST /api/uploads` gives `{uploadId, method, uploadUrl, headers, expiresAt}`; PUT the file to `uploadUrl` with **exactly** those headers (type and size are signed); then `POST /api/uploads/{id}/complete` gives `{id, status, purpose, url, width, height}`.
32. Then pass the id as `imageUploadId` (post) or `avatarUploadId` (profile). Each upload can be used **once**. A failed post save returns the upload, so the user can retry.
33. The slot expires (URL about 5 minutes, window about 15 minutes). Upload right after requesting it.
34. `complete` is idempotent and can be retried if the object has not arrived yet (400, stays pending). A rejected upload is final.
35. Limits: JPEG and PNG, 5 MB, 25 megapixels. Images are re-encoded (EXIF removed, resized to at most 2048 px, orientation applied), so the stored image differs from the original.
36. Image URLs point at the public R2 domain (`MEDIA_PUBLIC_BASE_URL`). If the frontend ever sets a CSP, allow that domain for images.

### Staff

37. **Role is read from the database on every staff call.** The `role` claim in the token is not trusted, so the UI should decide what to show from `GET /api/users/me`, not by decoding the token.
38. Moderators: report queue, resolve (409 if already resolved), hide and unhide posts and comments. **Admins only:** suspend and reinstate. Admins cannot be suspended, and nobody can suspend themselves.
39. Hide, unhide, suspend, reinstate are idempotent (204 both times).
40. The report queue is oldest-first, filterable by `status` (`OPEN` default, `ACTIONED`, `DISMISSED`), with a 200-character preview and the target's current status.

---

## Part 3: Not in the API (do not design UI for these)

- Edit posts or comments; delete your account; change email or password while signed in (only reset by email)
- Replies, comment likes, "who liked this", mentions, notifications, search, hashtags
- Multiple images per post, GIF, video, alt text
- Role changes, staff list, moderation history, appeals
- Hidden or deleted posts shown to their author

---

## Open questions

1. ~~Which paths do the emails link to?~~ Assumed `?token=` (A2); confirm in `MailTemplates.java`.
2. ~~Does `UserProfileResponse` contain `id`?~~ **Yes** (B8).
3. ~~Full `ErrorCode` list?~~ **Known** (status update above). Validation body shape still to verify (A5).
4. Which frontend origin(s) go into `CORS_ALLOWED_ORIGINS` for production?
5. Will the frontend be served from its own origin or from Spring's `static/` folder? The cookie is `SameSite=Strict`, so the frontend and API must be **same-site**.
6. Which text limits does the service really enforce (N1)?
