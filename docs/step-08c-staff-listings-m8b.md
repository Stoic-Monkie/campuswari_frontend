# Step 08c: staff listings and richer reports (M8b, backend patch 14)

Date: 2026-11-20. Status: done. Covered by tests; not yet tried in a browser.

## Input

The owner implemented backend patch 14 and uploaded `openapi_1.json` and `api_model_1.md`. The new contract matches the spec exactly: `GET /api/admin/posts`, `/comments` (hidden only, newest first), `GET /api/admin/users` (admin only, `status` SUSPENDED or ACTIVE, `q` username prefix of 2 to 30 characters), and four new optional fields on `ReportResponse`.

## What was built

- **Schemas and endpoints** for the three listings and the four report fields (all optional, null or absent).
- **`ReportCard`** rewritten: shows who wrote the target (link while ACTIVE, badge when suspended), "Open post" also for comment reports (`targetPostId`), and admin Suspend or Reinstate for the **author** of a post or comment report. It still works with older answers that lack the new fields.
- **`AuthorActions`**: one shared Suspend (with confirmation) and Reinstate control, used by report cards, hidden-content cards and the people list.
- **`/admin` sections:** Reports (the earlier queue, moved to `ReportsView`), **Hidden** (posts and comments tabs, Open post, Unhide, author actions for admins) and **People** (admins only: Suspended or Active, username search with a 300 ms pause and a 2-letter minimum, no button on admins or on yourself). A moderator typing `?view=people` is shown the reports.
- **Caches:** `setAuthorStatus` updates every report, hidden card and people row for that person at once; unhiding removes the item from the hidden lists; hiding reloads them.
- `StaffList` (shared loading, empty, error and load-more), `useDebouncedValue`, test factories for staff items.

## Decisions

- The people list is filtered by status, so after suspend or reinstate the row is removed and the list reloads, instead of patching it in place.
- No suspend button on admins or on yourself, matching what the API refuses (403, 400).
- The Hidden list shows only what the API returns (hidden); deleted content is not listed.

## Checks

227 tests (32 new): section tabs by role; hidden posts and comments (listing, plain-text rendering, unhide, paging, failures, suspended author, admin-only author actions); people (default list, toggle, debounced search, no action on admins or self, reinstate, suspend); richer report cards (comment's post link, author link, suspended badge, deleted target, moderator view, admin suspend with every report updating, reinstate); cache helpers; debounce hook. Typecheck, lint, build clean.

## Not yet verified in a browser

All of it with real moderator and admin accounts: see `moderation-test-script.md` sections 6 to 8.
