# Step 03: feed and posting (M3)

Date: 2026-11-13. Status: done. Posting confirmed in the browser by the owner.

## What was built

- `GET /api/posts` infinite feed: newest first, auto-load near the end plus a "Load more" button, refresh button, empty and error states. `INVALID_CURSOR` resets to the first page.
- `PostCard`: author, handle, relative time, plain-text body, optional image, read-only like and comment counts.
- `Composer`: code-point counter (limit 2000), blocks empty or over-limit text, Ctrl/Cmd+Enter posts, shows rate-limit wait, keeps text on failure.
- Cache handling: new posts are inserted at the top of the cached first page (no refetch); deletes remove the post from every cached page.
- Delete: confirm dialog; shown for the author or staff (`canDeletePost`); a 404 counts as already gone.
- `/new` full-screen composer for phones. `useMe` hook (`GET /api/users/me`, role and email-verified).
- Small shared parts: `ConfirmDialog`, `EmptyState`, `ErrorState`, `timeAgo`, `queryKeys`.

## Decisions

- User text is rendered as plain text with `whitespace-pre-wrap`; a test checks that injected HTML stays inert.
- Delete visibility is decided from `me.id` and `me.role` in the UI; the server stays the authority.
- There is no "new posts since" endpoint (issue N3), so refresh reloads from the top.

## Checks

62 tests (feed paging with cursor, empty and error states, new post appears on top without reloading, delete rules for student and moderator, composer limits and rate limiting, post card escaping, time formatting). Typecheck, lint, build clean.

## Not yet verified in a browser

Scrolling past one page, deleting your own post, a moderator deleting someone else's.
