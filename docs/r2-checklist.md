# R2 checklist for image uploads

Do this once, before trying photos in the browser. It mirrors the backend's patch-10 log; the only frontend-specific part is the CORS rule.

## 1. Buckets

- **Incoming bucket:** private. Raw uploads land here and are deleted after the API cleans them. Optional: a lifecycle rule that deletes objects after 1 day.
- **Public bucket:** readable (a custom domain is best; `r2.dev` is fine for a trial). Its address is `MEDIA_PUBLIC_BASE_URL`.
- API settings: `MEDIA_INCOMING_BUCKET`, `MEDIA_PUBLIC_BUCKET`, the R2 keys and `MEDIA_PUBLIC_BASE_URL`, with `app.media` mode set to the real storage (not `memory`).

## 2. CORS on the **incoming** bucket

The browser sends the file straight to this bucket, so the bucket must allow the frontend's origin. In the Cloudflare dashboard (R2, your incoming bucket, Settings, CORS policy), paste:

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

For production add the real `https://` origin (exact: scheme, host, port, no trailing slash). The public bucket needs no CORS rule for plain `<img>` tags.

## 3. Check it with curl (no frontend involved)

```bash
# 1. log in and ask for a ticket (token from /api/auth/login)
curl -s -X POST localhost:8080/api/uploads -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"purpose":"POST_IMAGE","contentType":"image/jpeg","size":'"$(stat -c%s photo.jpg)"'}'
# 2. PUT with exactly the returned headers
curl -X PUT "$UPLOAD_URL" -H 'Content-Type: image/jpeg' --data-binary @photo.jpg
# 3. complete
curl -s -X POST localhost:8080/api/uploads/$UPLOAD_ID/complete -H "Authorization: Bearer $TOKEN"
```

Expected: `complete` returns `READY` with a URL that opens the image, and the incoming bucket is empty again. A PUT with a different `Content-Type` or size must be refused by R2 (the signature pins both).

## 4. Check it in the browser

1. Open the app, press the photo button in the composer, pick a picture, write some text, press Post.
2. The button reads "Preparing photo…", "Uploading photo…", "Checking photo…", then the post appears with the photo.
3. In the browser's network tab the `PUT` goes to the R2 address (not `/api`), has **no** `Authorization` header, and returns 200.
4. Settings, Change photo: the new avatar appears on your profile and posts after a refresh.

## 5. If something fails

| Symptom | Likely cause |
|---|---|
| Message "Couldn't reach the image server" and a CORS error in the console | The CORS rule on the incoming bucket is missing, or the origin or the `Content-Type` header is not listed |
| "The upload link expired" (R2 answers 403) | The ticket is older than about 5 minutes, or the file's type or size differs from what was requested (should not happen with the app's conversion) |
| "That image can't be used" after two tries on `complete` | The API rejected the file (too many pixels, not a real image). Try another photo |
| Signature or checksum error on the PUT | SDK version on the API (2.29.0 is pinned on purpose) |
| Photo uploads but the post image is broken | `MEDIA_PUBLIC_BASE_URL` is wrong, or the public bucket is not readable |
| 429 on upload | Limit is 30 calls an hour across both upload endpoints (15 photos) |
