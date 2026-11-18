# Patch 14: Staff listings and report targets

## Summary

Two gaps found while building the moderation screens (frontend issues N9 and N10):

1. **Staff cannot find hidden content or suspended accounts.** Today the only way back to a hidden post, a hidden comment or a suspended person is a report that mentions it. Something hidden straight from a post menu (no report) is lost to the UI. Staff need read-only listings.
2. **A report row says too little about its target.** For a comment it gives only the comment id and a preview, for a person only an id. Staff cannot open the comment's post, jump to the person's profile, or suspend the author of a reported post.

This patch adds three read-only staff listings and four optional fields on `ReportResponse`. It changes **no table**, adds **no write endpoint**, and does not change how any existing endpoint behaves. It does not touch roles (the admin CLI in `status.md` stays a separate job).

## Status and verification

- **Status: implemented 2026-11-16, build not yet run by the maintainer.** This file was the proposal; the log of what was built (and the deviations from it) is `docs/dev_log/PATCHES/patch-14-staff-listings-and-report-targets.md`. Where the two differ, the log wins: index names follow the `idx_` convention, a `text_pattern_ops` index was added for the username search, and the status is written into the SQL so the partial indexes apply.
- Still to record after `./mvnw clean verify`: test count, build result, and the regenerated `openapi.json` (`scripts/export-openapi.sh`).

## New endpoints

All under `/api/admin`, guarded by `StaffGuard` (role read from the database on every call). A student gets 403, a suspended staff member gets 401. Paging is keyset, `{items, nextCursor}`, `limit` default 20 and max 50, bad cursor gives 400 `INVALID_CURSOR` (same `Cursor` and `Paging` helpers as the feed).

| Method | Path | Who | Behaviour |
|---|---|---|---|
| GET | `/api/admin/posts?status=HIDDEN&cursor=&limit=` | Moderator, admin | Posts with that status. `status` accepts `HIDDEN` (default); any other value is 400 for now. Newest first by `(created_at, id)` |
| GET | `/api/admin/comments?status=HIDDEN&cursor=&limit=` | Moderator, admin | Same for comments |
| GET | `/api/admin/users?status=SUSPENDED&q=&cursor=&limit=` | **Admin only** | Accounts with that status (`SUSPENDED` default, or `ACTIVE`). Optional `q`: username prefix search, 2 to 30 characters, lower-cased, `%` and `_` escaped. Newest account first by `(created_at, id)` |

Moderators get 403 on the users listing: they cannot act on accounts, so they do not need the list. (Relax later if the moderators ask.)

### Response shapes

```
StaffPostResponse    { id, author: AuthorResponse, authorStatus, content, imageUrl?, status, likeCount, commentCount, createdAt }
StaffCommentResponse { id, postId, author: AuthorResponse, authorStatus, content, status, createdAt }
StaffUserResponse    { id, username, displayName, avatarUrl?, role, status, createdAt }
StaffPostPageResponse / StaffCommentPageResponse / StaffUserPageResponse { items, nextCursor? }
```

- `status` is `HIDDEN` for posts and comments; `ACTIVE` or `SUSPENDED` for users. `authorStatus` is the author's `ACTIVE` or `SUSPENDED` (so the screen can offer Suspend or Reinstate without a second call).
- **No email, no password data, no token data** in any of them. Content is returned as stored (raw text; the clients render it as plain text).
- Not audited: they are reads, and the same staff can already read hidden content through `GET /api/posts/{id}` and the report queue.

## Extended `ReportResponse` (existing endpoint, new optional fields)

| Field | For a POST report | For a COMMENT report | For a USER report |
|---|---|---|---|
| `targetPostId` | the post id | the comment's post id | `null` |
| `targetAuthorId` | the post's author | the comment's author | the reported person |
| `targetAuthorUsername` | their username | their username | their username |
| `targetAuthorStatus` | `ACTIVE` or `SUSPENDED` | same | same |

All four are `null` if the target row no longer exists. Existing fields are unchanged, so old clients keep working. This adds ids and usernames only; staff already see the preview and the reporter's username, and usernames are public, so it opens nothing new.

## Design

- **Read-only, small.** Three queries and one join. Everything reuses the existing visibility vocabulary (`status`, `ACTIVE`) and the keyset pattern from Patch 7: two SQL strings (first page, later pages), `limit + 1` rows, cursor at the last returned row.
- **Ordering by creation time, not by hidden time.** There is no `hidden_at` column. "Newest first" is stable and cheap; if staff want "most recently hidden first", add the column in a later patch.
- **Report targets by `LEFT JOIN`.** In the queue query, join `posts` when `target_type = 'POST'`, `comments` when `'COMMENT'`, and resolve the author through `users` (the post's or comment's author, or the target id itself for `USER`). One round trip, same page size.
- **Admin-only user listing** follows the rule that only admins touch accounts; `q` is a prefix match so it can use an index and cannot be used to dump the table (the page limit still applies, and the list is staff-only anyway).
- **Escape `LIKE`.** `q` is lower-cased and `%`, `_` and the escape character are escaped before use; it is bound as a parameter, never concatenated.

## Migration `V7__staff_listing_indexes.sql` (indexes only)

As built (names checked against `V1` to `V6`; see `V7__staff_listing_indexes.sql`):

```sql
CREATE INDEX idx_posts_hidden            ON posts    (created_at DESC, id DESC) WHERE status = 'HIDDEN';
CREATE INDEX idx_comments_hidden         ON comments (created_at DESC, id DESC) WHERE status = 'HIDDEN';
CREATE INDEX idx_users_suspended         ON users    (created_at DESC, id DESC) WHERE status = 'SUSPENDED';
CREATE INDEX idx_users_active_created    ON users    (created_at DESC, id DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_users_username_prefix   ON users    (username text_pattern_ops);
```

The `V1` UNIQUE index on `username` uses the default collation and cannot serve `LIKE 'abc%'` unless the collation is `C`, so the `text_pattern_ops` index is needed, not optional.

## Tests to add (about 20)

In `ModerationApiIntegrationTest` (or a new `StaffListingApiIntegrationTest`):

- Student gets 403 on all three listings; a suspended moderator gets 401; no token gets 401.
- Hide a post, then it appears in `/admin/posts` and not in the feed; unhide, and it leaves the list.
- Same for a hidden comment; a visible or deleted post never appears.
- Paging: two pages with a cursor, no gaps or repeats; a tampered cursor gives 400 `INVALID_CURSOR`; `status=VISIBLE` gives 400.
- Users: moderator gets 403, admin gets 200; suspend, then the person appears under `SUSPENDED`; reinstate, then they leave it; `ACTIVE` lists active accounts.
- `q`: prefix match, case-insensitive; `%` and `_` match nothing special; fewer than 2 characters gives 400.
- No response contains an email, in any listing.
- Report queue: for a POST report, `targetPostId` is the post and `targetAuthor*` is its author; for a COMMENT report `targetPostId` is the comment's post; for a USER report `targetPostId` is null and the author is the person; when the target is deleted the four fields are `null`; `targetAuthorStatus` flips after a suspend.
- Existing report queue tests still pass unchanged.

## After this patch

- Regenerate `openapi.json` and drop it into `docs/frontend/`; add a line to `api_model.md` section 8.
- **Frontend follow-up (M8b), about one step:** report cards get "Open post" for comments, an author link, and Suspend author for admins on post and comment reports; `/admin` gets a "Hidden" area with tabs Posts, Comments and, for admins, People (with username search), each with Unhide or Reinstate. The frontend will be written against the final `openapi.json`.

## Not in this patch

- Role changes (the admin CLI), an audit-log viewer, "hidden at" time or reason, and notifying the author. Candidates for later.
