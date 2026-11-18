# Error responses

Every error the API produces is `application/problem+json` (RFC 9457). The shape below is taken from `GlobalExceptionHandler`, the security entry points and `BodySizeLimitFilter`. The machine-readable version is the `Problem` schema in `openapi.json` (see `scripts/export-openapi.sh`).

```json
{
  "type": "urn:campuswari:problem:unauthorized",
  "title": "Authentication required",
  "status": 401,
  "detail": "Authentication is required.",
  "instance": "/api/posts",
  "code": "UNAUTHORIZED"
}
```
(The 401 above is a real response, captured from the running API. `instance` is present on most errors.)

| Field | Always there | Meaning |
|---|---|---|
| `code` | yes | Stable machine code. **Branch on this**, never on `detail` or `title` |
| `status` | yes | The HTTP status, repeated |
| `title`, `type` | yes | Fixed per code |
| `detail` | yes | A human sentence. May change wording between versions. Never contains anything you submitted |
| `instance` | usually | The request path |
| `errors` | only `VALIDATION_FAILED` | List of `{field, message}`, one per invalid field. `field` is the JSON property name; `message` is our own text, never your value |
| `errorId` | only `INTERNAL_ERROR` | Quote it when reporting a problem; the server log has the details under the same id |

## Validation errors (400, `VALIDATION_FAILED`)

```json
{
  "type": "...", "title": "...", "status": 400,
  "detail": "One or more fields are invalid.",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "email", "message": "must be a well-formed email address" },
    { "field": "password", "message": "must not be blank" }
  ]
}
```
Only bean-validation failures carry `errors`. Rules checked in the services (for example "Nothing to update." or a weak password) come back as a **single `detail`** with a different `code`, and no `errors` list. The frontend needs both paths until this is unified (frontend notes, B1).

## Codes

The full, current list is the `enum` of `Problem.code` in the generated `openapi.json` (it is built from the `ErrorCode` class, so it cannot go stale):

`BAD_REQUEST`, `VALIDATION_FAILED`, `INVALID_CURSOR`, `UNAUTHORIZED`, `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `INVALID_TOKEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, and `PAYLOAD_TOO_LARGE`.

| Code | Usual status | Notes |
|---|---|---|
| `BAD_REQUEST` | 400 | Unreadable JSON, wrong types, or an **unknown field** (these are rejected on purpose). The detail is generic |
| `VALIDATION_FAILED` | 400 | With `errors` |
| `INVALID_CURSOR` | 400 | Restart paging from the first page |
| `UNAUTHORIZED` | 401 | No or invalid token, suspended or deleted account, failed refresh, wrong login. Sent with `WWW-Authenticate: Bearer` |
| `FORBIDDEN` | 403 | Signed in, not allowed |
| `EMAIL_NOT_VERIFIED` | 403 | Show the "check your email" screen |
| `NOT_FOUND` | 404 | Also used for blocked content and other people's hidden items, on purpose |
| `CONFLICT` | 409 | For example resolving an already resolved report |
| `RATE_LIMITED` | 429 | Carries a `Retry-After` header (seconds). Disable the action until it passes |
| `PAYLOAD_TOO_LARGE` | 413 | JSON body over 64 KB |
| `INTERNAL_ERROR` | 500 | With `errorId` |
| `INVALID_TOKEN` | see the response | A one-time token (email verification or password reset) that is wrong, used or expired |

## Capturing real samples

Anything above marked "usual" should be confirmed once against the running API. These capture real bodies into one file:

```bash
{
  echo '## 400 validation';       curl -s -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' -d '{}'; echo
  echo '## 400 unknown field';    curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{"nope":1}'; echo
  echo '## 401 no token';         curl -s localhost:8080/api/posts; echo
  echo '## 413 too large';        curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' --data-binary @<(head -c 70000 /dev/zero | tr '\0' 'a'); echo
} > docs/frontend/error-samples.md
```
