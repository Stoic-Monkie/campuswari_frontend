# Step 05: profiles and settings (M5)

Date: 2026-11-15. Status: done. Covered by tests; not yet tried in a browser.

## What was built

- **Profile page** `/u/:username`: avatar, name, @username, "Joined <month year>", bio, and that person's posts (cursor paging, likes, delete). A 404 shows "This profile isn't available" (unknown, suspended or blocked) and the posts are not requested. On your own profile an Edit button leads to settings; the empty message differs for you and for others.
- **Settings** `/settings`:
  - Profile form: name and bio, email (with confirmed state) and username shown read-only. Only changed fields are sent; clearing the bio sends `""`. Limits: name 60, bio 300 (code points). Server field errors land on the input. On success the cached "me" is replaced by the response and cached feeds, profiles and posts are marked stale (names appear on posts).
  - Appearance: Match my device / Light / Dark (stored as `cw-theme`).
  - Sessions: Log out, and "Log out everywhere" (confirm, `POST /api/auth/logout-all`, then this device is logged out too).
- Bottom nav "Profile" now opens your own profile (falls back to settings until the username is known).
- **Shared `PostList`** (loading, empty, error, auto-load, "Load more", delete) now serves both the feed and profiles; `FeedPage` shrank to the composer plus the list.
- **Cache helpers** now update every list at once: `patchPostInCaches` and `removePostEverywhere` cover the feed, all profile post lists and the detail cache. Creating a post marks profile lists stale.
- Endpoints added: `getProfile`, `listUserPosts`, `updateMe`, `logoutAll`. `PATCH /users/me` returns the full `MeResponse` (confirmed in `openapi.json`).

## Decisions

- "Log out everywhere" also ends this device's session, because an access token can stay valid for up to 15 minutes after the server revokes refresh tokens (issue B9).
- The username cannot be changed (API accepts only name, bio and avatar).
- Block and Report buttons are not shown on profiles yet; they arrive with M7. Avatar change arrives with M6.

## Checks

98 tests (21 new): profile header, posts, paging, 404, Edit link rules, empty messages; settings prefill, only-changed-fields, clearing the bio, validation, server field errors, theme switch, log out everywhere (confirm, cancel, failure), log out; cache helpers; nav link. Typecheck, lint, build clean.

## Not yet verified in a browser

Open a profile from a post, edit your name and see it on your posts after a refresh, change theme, "Log out everywhere" from two browsers.
