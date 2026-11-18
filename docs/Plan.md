# CampusWari frontend plan

Companion files: [`api_model.md`](api_model.md) (the API contract) and [`../ISSUE/frontend-integration-notes.md`](../ISSUE/frontend-integration-notes.md) (issues and quirks).
Code lives in `FRONTEND/` at the repository root. Docs live here.

## 1. Goal and scope

A mobile-first web app for the campus social API: sign up with a college email, post text and one image, browse a campus feed, comment, like, block, report, and moderate.

**In scope (v1):** everything the API offers today. **Out of scope:** anything in Part 3 of the issue notes (editing, notifications, search, replies, and so on). Native apps and a PWA are later.

Assumptions I made (change them and the plan adapts):

- One round, in the milestone order of section 9, so you can stop after any milestone.
- Look and feel: clean, light and dark theme, system font stack, one accent colour, no brand assets yet.
- English only for now, but all text goes through one place so Hindi or Malayalam could be added (section 7).

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict) | Requested |
| Routing | React Router (data router, lazy routes) | Standard, route guards, code splitting |
| Server state | TanStack Query | Caching, infinite feed, optimistic likes, retries |
| Forms | React Hook Form + Zod | Validation shared with response parsing |
| Runtime validation | Zod | Responses are parsed, so an API change fails loudly in one place |
| Styling | Tailwind CSS | Fast, consistent, dark mode |
| Tests | Vitest, React Testing Library, MSW; Playwright later | Mock the API in tests; a real browser test for the cookie flow |
| Lint and format | ESLint, Prettier | |
| Package manager | npm | Already on the machine with Maven; no extra tooling |

No global state library. Session lives in one React context; everything else is server state in TanStack Query.

## 3. Folder layout (`FRONTEND/`)

```
FRONTEND/
├── index.html
├── vite.config.ts            dev proxy /api -> localhost:8080
├── package.json
├── .env.example              VITE_API_BASE (default /api), VITE_APP_NAME
└── src/
    ├── main.tsx
    ├── app/                  providers, router, layout shell, route guards
    ├── api/
    │   ├── client.ts         fetch wrapper: bearer header, single-flight refresh, problem+json, 429
    │   ├── errors.ts         ApiError, error-code helpers
    │   ├── schemas.ts        Zod schemas + inferred types (the ONLY place that knows field names)
    │   └── endpoints/        auth.ts users.ts posts.ts comments.ts likes.ts uploads.ts blocks.ts reports.ts admin.ts
    ├── session/              SessionProvider, useSession, token store (memory only)
    ├── features/
    │   ├── auth/             login, register, check-email, verify-email, forgot, reset
    │   ├── feed/             feed list, post card, composer
    │   ├── post/             post detail, comments, like button
    │   ├── profile/          profile page, settings, avatar, blocked users
    │   ├── report/           report dialog
    │   └── admin/            queue, hide/suspend actions
    ├── components/           Button, Input, Dialog, Toast, Avatar, Spinner, EmptyState, ErrorState
    ├── lib/                  text counting, relative time, upload helper, i18n strings
    └── test/                 MSW handlers, test utilities
```

Rule: **components never call `fetch`**. They use hooks from `features/*`, which call `api/endpoints/*`, which call `api/client.ts`.

## 4. The API client (the part that must be right)

1. **Access token in memory only** (module variable inside the session store). Never `localStorage` or `sessionStorage`.
2. **Every request** adds `Authorization: Bearer ...`, and uses `credentials: "include"` for `/api/auth/*`.
3. **Single-flight refresh.** One shared promise for `POST /api/auth/refresh`. Any request that gets 401 (or a call made while no token is held) awaits that promise, then retries **once**. Two simultaneous refreshes would trigger reuse detection and kill the session, so this is a hard rule with a unit test.
4. **Boot:** on page load, call refresh once to restore the session; show a splash until it settles.
5. **Failed refresh** means signed out: clear state, redirect to `/login`, keep the intended path for after login.
6. **Proactive refresh** shortly before `expiresIn`, plus on tab refocus, to avoid a 401 round-trip. The 401-retry path stays as the safety net.
7. **Lost refresh response** (network drop after the server rotated) logs the user out (known issue B2). The client shows "You were signed out, please sign in again" and does not loop.
8. **Problem+json parsing** into an `ApiError { status, code, detail, fieldErrors, retryAfter, errorId }`. UI branches on `code` and `status`, never on `detail` text.
9. **429:** surface `retryAfter`; the button disables for that time. No automatic retry on writes.
10. **Never retry non-idempotent calls** (create post, comment, upload) automatically. Likes and block are idempotent and may retry.
11. **Responses are parsed with Zod.** A mismatch logs a clear developer error and shows a generic error to the user.

## 5. Routes and screens

| Route | Screen | Auth | Notes |
|---|---|---|---|
| `/login` | Login | guest | Sends `delivery: "COOKIE"`. 403 `EMAIL_NOT_VERIFIED` goes to check-email |
| `/register` | Register | guest | Live rules for username and password. Always shows the same "check your email" result |
| `/check-email` | Check your email | guest | Resend with cooldown. Mentions the 7-day expiry |
| `/verify-email` | Verify | any | Reads `?token`, POSTs it, shows success or "invalid or expired" |
| `/forgot-password` | Forgot | guest | Always the same confirmation |
| `/reset-password` | Reset | any | Reads `?token`, new password with rules; link stays valid after a weak-password error |
| `/` | Feed | user | Infinite scroll, pull-to-refresh, composer on top |
| `/posts/:id` | Post detail | user | Post, like, comments (oldest first, load more), delete if allowed |
| `/u/:username` | Profile | user | Their posts; block and report menu; own profile links to settings |
| `/settings` | Settings | user | Edit name and bio, avatar upload, blocked users, sign out, sign out everywhere |
| `/admin` | Reports queue | moderator, admin | Filter by status, preview, hide or unhide, resolve; admin sees suspend and reinstate |
| `*` | Not found | any | Also what blocked content looks like |

Route guards: guests are redirected away from user routes (keeping the path), signed-in users away from the guest routes, and `/admin` checks the role from `GET /api/users/me` (the server re-checks every call; the UI check is only cosmetic). **This needs `role` in `MeResponse`**, see api_model section 9.

## 6. Feature behaviour that needs a decision

| Topic | Plan |
|---|---|
| Feed | `useInfiniteQuery`; "new posts" is a pull-to-refresh or a refresh button (the API does not show new posts mid-session) |
| Like | Optimistic toggle, then replace with the server's `{likedByMe, likeCount}`. Roll back on error |
| New post | After 201, insert at the top of the cached first page |
| Delete | Confirm dialog, remove from cache. Shown only to the author, or to staff |
| Composer | Counts code points (`[...text].length`), limit 2000 (post) and 1000 (comment). Disabled while pending or rate-limited |
| Image upload | Pick file, check type and size (JPEG or PNG, 5 MB), **downscale or convert in the browser** with a canvas (also fixes HEIC or WebP from phones, issue B10), then request ticket, PUT, complete, attach. Progress bar. Request the ticket only when the user is ready to send |
| Avatar | Same upload flow with purpose `AVATAR`, then `PATCH /me` |
| Blocks | Block from a profile or post menu; list and unblock in settings. After blocking, navigate away (the profile will 404). The UI never says "this person blocked you" |
| Reports | Dialog with reason and optional details (500 chars); 200 (already reported) is shown as success |
| Counts | Show server counts as they are; do not try to reconcile with lists (issue B6) |
| Unverified user | Cannot log in, so there is no read-only mode. If a 403 `EMAIL_NOT_VERIFIED` appears later, show the verify prompt |
| Text rendering | Plain text only, `white-space: pre-wrap`, never `dangerouslySetInnerHTML`. Links are not auto-linked in v1 |
| Time | Relative ("5 m") with the full time in a tooltip |

## 7. UX, accessibility, quality

- Mobile first (360 px wide up); bottom navigation on phones, side navigation on desktop.
- Dark and light theme from `prefers-color-scheme`, with a manual toggle.
- Keyboard and screen-reader basics: labelled inputs, focus management in dialogs, `aria-live` for toasts and errors, visible focus, 44 px touch targets.
- Every list has loading, empty and error states. Every form has field errors and a pending state.
- All user-facing text lives in `src/lib/strings.ts` so it can be translated later.
- No third-party trackers, fonts or CDNs: the API's CSP is strict and campus users' privacy matters. System fonts only.

## 8. Dev, build and deployment

**Dev:** `npm run dev` on `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8080`, so the browser sees one origin and cookies behave like production. Required on the API side (local profile only): add `http://localhost:5173` to CORS origins and make sure the proxy forwards `Origin` (issue A3). Image upload needs real R2 buckets with CORS (issues A6, A7).

**Production:** the refresh cookie is `SameSite=Strict`, so the page and API must be **same-site**. Two workable layouts:

1. **One hostname (recommended):** Cloudflare (or nginx/Caddy) serves the static build at `/` and forwards `/api/*` to the app. No CORS needed in practice, and the cookie is first-party.
2. **Two subdomains:** `app.example.edu` (static) and `api.example.edu` (API). Same-site, so the cookie works, but CORS and the exact `Origin` must be set (`CORS_ALLOWED_ORIGINS`, `FRONTEND_BASE_URL`, both `https://`, per the prod safety check).

Build output is plain static files (`npm run build` into `dist/`). A small `Dockerfile` or an nginx service can be added to `deploy/compose.yaml` later; not part of v1.

## 9. Milestones

Each milestone ends with something you can run and check.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Scaffold:** Vite, TypeScript strict, Tailwind, ESLint/Prettier, router shell, proxy, `.env.example`, MSW and Vitest set up | `npm run dev` shows the shell; `npm test` and `npm run build` pass |
| M1 | **API client and session:** client, errors, Zod schemas, single-flight refresh, session provider, boot refresh | Unit tests: concurrent 401s cause exactly one refresh; failed refresh signs out; 429 parsed |
| M2 | **Auth screens:** login, register, check-email, verify, forgot, reset | Full account lifecycle works against the local API with `mail.mode: log` (link read from the log) |
| M3 | **Feed and posting:** layout shell, feed, composer (text only), post card, delete | Create, scroll, delete, tampered cursor handled |
| M4 | **Post detail, comments, likes** | Optimistic like matches server; comments page oldest-first; counts correct |
| M5 | **Profiles and settings:** profile page, edit name and bio, sign out everywhere | Matches API rules (404 for unknown or blocked) |
| M6 | **Images:** upload flow for posts and avatars | R2 smoke test passed first; EXIF-stripped image shows in feed |
| M7 | **Blocks and reports** | Block hides content and lists in settings; duplicate report shows success |
| M8 | **Admin:** queue, hide/unhide, resolve, suspend/reinstate | Student gets no admin UI; moderator cannot see suspend; admin can |
| M9 | **Polish and release:** accessibility pass, empty/error states, Playwright test of login-refresh-logout in a real browser, build and deployment notes | Cookie flow verified in Chromium and Firefox (issue A1) |

M0 to M4 give a usable app (sign up, post, comment, like). M5 to M8 are independent of each other once M3 is done.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Cookie flow untested in a browser (A1) | Do M1 and M2 early and test in a real browser before building more |
| Field names in `api_model.md` are inferred | Dump the DTOs (api_model section 9) before M1; all names live in `schemas.ts` |
| `MeResponse` may lack `role` | Needed for M8; check early, small API change if missing |
| Refresh race or lost response logs users out (B2) | Single-flight lock, clear messaging; consider an API grace window |
| HEIC/WebP photos rejected (B10) | Convert to JPEG in the browser (M6) |
| R2 untested (A6) | Smoke test before M6 |
| Rate limits hit on shared campus Wi-Fi (B11) | Show `Retry-After`, disable the control, never auto-retry writes |

## 11. What I need from you to start M0

1. Output of the commands in `api_model.md` section 9 (DTO dump, error code, mail templates, a real validation error). Without them I code to the inferred shapes and fix later.
2. Confirm the dev origin `http://localhost:5173` can be added to the local CORS list.
3. Node version on your machine (`node -v`; Vite needs 20.19+ or 22.12+). If Node is missing or old, tell me and I'll adjust the setup steps.
4. Any colour or brand preference (otherwise a neutral theme with one accent).
