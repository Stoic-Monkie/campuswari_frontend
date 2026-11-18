# Step 07: blocks and reports (M7)

Date: 2026-11-18. Status: done. Covered by tests; not yet tried in a browser.

## What was built

- **"More options" menu** (`Menu`, `SafetyMenu`) on other people's posts (feed, profile lists, post page), comments, and profiles. Items: Report post / comment / this person, and Block @username. It is hidden on your own content and until `/users/me` has loaded. Keyboard: Escape closes and returns focus, arrow keys move.
- **Report dialog:** pick a reason (Spam, Harassment, Hate, Adult content, Impersonation, Something else) with a one-line hint each, optional details (500 characters, trimmed, left out when empty). A new report (201) and an already-reported target (200) both show "Thanks for letting us know"; 404 says the target is no longer available; a 400 shows the server's reason (for example reporting yourself); 429 shows the wait.
- **Block:** a confirm dialog ("They aren't told", unblock in Settings), then `PUT /api/users/{id}/block`. The blocked person's posts, comments, post pages and profile are removed from every cache immediately (`hideAuthorEverywhere`); leaving their profile or post page navigates home.
- **Settings, "Blocked people":** paged list (newest first) with Unblock; unblocking reloads feeds, comments and posts because their content is visible again.
- `Modal` component extracted; `ConfirmDialog` now uses it (focus moves in, returns afterwards).
- Endpoints: `blockUser`, `unblockUser`, `listBlocks`, `createReport`. Query keys for blocks and comments added.

## Decisions

- The menu is passed into `PostCard` and `CommentItem` as a prop, so those components stay free of session and block logic.
- The UI never says "this person blocked you": blocked-by content simply answers 404.
- Block works from the id the API gives in author and profile objects; no username lookups.
- Counts (comment counts, like counts) are not adjusted after a block (issue B6).

## Checks

156 tests (36 new): menu behaviour; report dialog (reason required, body shape, details, 200 vs 201, over-long details, 404, 400, 429, cancel); safety menu (hidden for own content and before `me` loads, items per target, confirm before block, block by user id, cancel, failure keeps the dialog open); cache purge across feed, profile lists, comments, post page and profile; blocked list (list, empty, unblock, paging, error retry, unblock failure); placement in feed, comments and profile (blocking from the feed removes the posts at once; blocking from a profile goes home). Typecheck, lint, build clean.

## Not yet verified in a browser

Report from a post, comment and profile; block and unblock with two accounts; the other person's view after you block them.
