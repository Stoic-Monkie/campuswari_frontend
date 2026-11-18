# Step 06: images for posts and avatars (M6)

Date: 2026-11-16. Status: done. Covered by tests; not yet tried against real R2 or in a browser.

## What was built

- **Photo conversion in the browser** (`prepareImage`, canvas): any image the browser can read (JPEG, PNG, WebP, HEIC where supported) becomes a right-way-up JPEG, longest side 2048 px for posts and 512 px square-cropped for avatars, tried at quality 0.85, 0.7, 0.55 until it is under 5 MB. Transparent areas become white. This is what makes phone photos work, since the API accepts only JPEG and PNG. The size and shape maths is in `lib/imageMath.ts` (unit-tested); the canvas glue is browser-only.
- **Three-step upload** (`uploadImage`): `POST /api/uploads` (with the converted file's real type and size, because both are signed), `PUT` straight to the presigned URL with exactly the returned headers (no bearer token, `credentials: "omit"`, forbidden headers such as Content-Length left to the browser), then `POST /api/uploads/{id}/complete`, retried once after a short wait on a 400 (the file may not be in storage yet). Failures become plain messages: expired link (403), unreachable storage (usually CORS), rate limit with the wait time, unconfirmed email, or the server's reason.
- **Composer:** photo button, preview with a remove button, and button text that follows the stages. The upload happens when the user presses Post (the ticket lasts only about 5 minutes), then the post is created with `imageUploadId`. If the upload fails, the text and photo stay. If only creating the post fails with a server or network error, the finished upload is reused on retry; after a 400 it is uploaded again to be safe.
- **Avatar:** Settings has a Change photo button: pick, square crop, upload as `AVATAR`, attach with `PATCH /api/users/me {avatarUploadId}`; the cached profile is replaced and cached posts, comments and profiles are marked stale.
- Post images now have alt text ("Photo posted by <name>"); the API has no per-photo description.
- `refreshAuthorCaches` shared helper for name and photo changes.

## Decisions

- Convert on pick (instant preview, early errors), upload on Post (fresh ticket).
- A stage label instead of a percentage bar: `fetch` cannot report upload progress, and a stage label is simpler and reliable.
- No avatar removal: the API accepts only a new upload id.

## Checks

120 tests (22 new): image maths; upload orchestration (headers, order, 403, network failure, retry on 400, give up with reason, rate limit, unverified email); composer with a photo (preview and remove, upload then post order, text-only post, failure keeps content, retry without re-upload, re-upload after a 400, unreadable format); avatar flow and failure. Typecheck, lint, build clean.

## Not yet verified

The R2 buckets and CORS rule (see `r2-checklist.md`), the canvas conversion in real browsers (phone photos, HEIC in Safari), and the real PUT to R2.
