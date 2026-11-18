# Storage setup for photo uploads

Updated 2026-11-18. **Local development uses SILO** (an S3-compatible server on the developer's machine). Cloudflare R2, AWS S3 and MinIO still work by changing the same settings, so those options stay open. The frontend does not care which: it uploads to whatever address the API hands out.

Step-by-step SILO setup lives in the backend repo: `docs/silo-setup.md`; the decision record is `patch-13-silo-storage.md`. This page keeps the frontend-side view and the checks.

## How it works

1. The browser asks the API for an upload link, then `PUT`s the file **straight to the storage address in that link**. The API never receives the file.
2. So that address must be reachable **from the browser**, and storage must allow the frontend's origin if it enforces CORS.
3. The API reads the raw file from the **private** bucket, re-encodes it, and writes the clean copy to the **public** bucket. The app shows the public copy.

## Current local setup (from patch 13)

| Item | Value |
|---|---|
| S3 API / console | `http://127.0.0.1:9000` / `http://localhost:9001` |
| Buckets | `campuswariprivate` (raw uploads, no anonymous access), `campuswaripublic` (cleaned images, anonymous **read only**) |
| App credentials | A dedicated key named `campuswari`, not the root user |
| Key file | `secrets/silo/silo_acess.json` (gitignored; the filename keeps its typo on purpose), imported by Spring; helper `scripts/import-silo-key.sh` converts a file downloaded from SILO |
| Config (`application-local.yaml`) | `app.media.mode: s3`, `public-base-url: ${siloUrl}/campuswaripublic`, endpoint `${siloUrl}`, region `us-east-1`, the two bucket names and the keys |
| Addressing | Path-style: already how the backend builds both the S3 client and the presigner. No code change was needed |
| CORS | No SILO rule was needed for uploads from the local frontend. Revisit if the frontend origin changes |

Public bucket policy (read only, whole bucket; **never** allow `PutObject` or `DeleteObject` anonymously):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": {"AWS": ["*"]},
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::campuswaripublic/*"]
  }]
}
```

## What has been checked

| Check | Result |
|---|---|
| Profile photo upload through the app | Works end to end against SILO (owner, 2026-11-15) |
| Anonymous `PUT` to the public bucket | 403 |
| Anonymous `GET` from the private bucket | 403 |
| Anonymous `GET` of a public object | 200 |
| A **post with a photo** | Works: shows in the feed from the SILO public address (owner, 2026-11-18) |
| The private bucket is emptied after processing | Not yet checked |

## Test a post photo in the browser

1. Open the app, press the photo button in the composer, choose a picture, write text, press Post. The button reads "Preparing photo…", "Uploading photo…", "Checking photo…", then the post appears with the photo.
2. In the network tab the `PUT` goes to the SILO address (not `/api`), has **no** `Authorization` header, and returns 200.
3. Open the image address in a new tab (it starts with `siloUrl/campuswaripublic/img/`). Then list the private bucket: it should be empty.
4. Settings, Change photo: the avatar appears on your profile and posts after a refresh (already confirmed once).

## If something fails

| Symptom | Likely cause |
|---|---|
| "Couldn't reach the image server" and a CORS error in the console | CORS on the storage server, or the upload address is not reachable from the browser |
| "The upload link expired" (storage answers 403) | Ticket older than about 5 minutes, or the file's type or size differs from the request |
| "That image can't be used" after two tries on `complete` | The API rejected the file (too many pixels, not a real image). Try another photo |
| Signature or checksum error on the PUT | SDK version on the API (2.29.0 is pinned on purpose) |
| Post works but the image is broken | `public-base-url` is wrong, or the public bucket is not readable anonymously |
| API runs in Docker or on another machine | The key file's `siloUrl` is used for both API calls and the upload links, so it must be an address the **browser** can reach too |
| 429 on upload | 30 calls an hour across both upload endpoints (15 photos) |
| Credentials stop working | Rotate and re-import the key (`scripts/import-silo-key.sh --force`); keys pasted in chats should be rotated anyway |

## Other servers (kept as options)

Same settings, different values:

| Server | Endpoint | Region | Public base URL |
|---|---|---|---|
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | `auto` | custom domain, or `r2.dev` for a trial |
| MinIO or similar | `http://localhost:9000` | `us-east-1` | `http://localhost:9000/<public-bucket>` |

R2 needs a CORS rule on the **private** bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

For production add the real `https://` origin (exact; no trailing slash).

## Open items on the backend side (from patch 13)

- The unused `io.minio:minio` dependency is still in `pom.xml`.
- `compose.yaml`, `deploy/compose.yaml` and `startup-kit/Docker/env` still use the old variables.
- Confirm `secrets/` is git-ignored while `silo_acess.example.json` stays committable (`git check-ignore -v`).
