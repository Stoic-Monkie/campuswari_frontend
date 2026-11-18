# Step 06c: storage is SILO (backend patch 13)

Date: 2026-11-18. Status: documentation only.

The owner switched local development to a SILO S3-compatible server (backend `patch-13-silo-storage.md`) and confirmed a profile photo upload works end to end. Frontend code is unchanged.

- `storage-setup.md` rewritten around SILO: current local setup, public-bucket policy (read only), what has and has not been checked, failure table, other servers kept as options (R2 with its CORS rule, MinIO).
- Issue notes: A6 partly confirmed, A7 answered, N7 resolved (the backend already uses path-style addressing).
- Still to check: a post with a photo, and that the private bucket empties afterwards.
