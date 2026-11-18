# Step 06b: local storage option for photos

Date: 2026-11-17. Status: documentation only; no app behaviour changed.

## Decision

The owner has no Cloudflare account and wants local methods, with R2 kept as an option. Photo storage for development will be a **local S3-compatible server (MinIO in Docker)**. The backend already reads `MEDIA_S3_ENDPOINT` and `MEDIA_S3_REGION`, so no new storage code is needed beyond one possible flag.

## What changed

- `r2-checklist.md` replaced by `storage-setup.md`: option A (local MinIO: start, buckets, API variables, curl check), option B (Cloudflare R2, CORS rule), option C (a local-disk mode in the backend, described but not built), a browser test and a failure table.
- Issue notes: A6 and A7 updated; new item **N7**: a local server needs path-style bucket addressing in both the S3 client and the presigner; `S3ObjectStorage.java` was not read, so this must be checked.
- The upload error message in the frontend console hint now mentions the storage server's CORS and reachability in general.

## Facts and assumptions

- MinIO stopped publishing new Docker images in October 2025; the existing `quay.io/minio/minio` image still works for development (found by web search). Other S3-compatible servers can replace it.
- MinIO answering any origin by default (so no CORS rule locally) is from memory; the guide says what to set if it does not.
- `MEDIA_PUBLIC_BASE_URL` includes the bucket name for MinIO; this assumes the API builds image addresses as `<base>/<key>`. The curl check confirms it.

## Checks

Frontend unchanged apart from a log message: 120 tests, typecheck, lint pass.
