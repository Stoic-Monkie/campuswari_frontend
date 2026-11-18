# Frontend status

> Overwritten on every update. Design lives in `Plan.md` (stable). History lives in `dev_log/` (append-only).

Updated: 2026-11-17

## Where we are

**M0 to M8b done.** Next: **M9** (polish and release). All planned screens exist and backend patch 14 is in use.
The app runs at `http://localhost:5173` (Vite proxy to the API on `:8080`) and, since 2026-11-17, publicly at `https://www.campuswari.xyz` through a Cloudflare Tunnel (still the Vite dev server; see `docs/public-access-cloudflare.md`). Photos on the public domain work because SILO is published as `media.campuswari.xyz`. Owner confirmed login, sessions and posting work in the browser (Brave). Profile photo upload **and a post with a photo** are confirmed against SILO. M4, M5, M7 and M8 are covered by tests only so far.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Scaffold, tokens, wordmark, theme, shell, `/design` | done |
| M1 | API client and session (single-flight refresh) | done |
| M2 | Auth screens | done, confirmed in browser |
| M3 | Feed and posting (text only) | done; posting confirmed in browser; paging, delete and moderator delete not yet reported |
| M4 | Post detail, comments, likes | done; not yet tried in a browser |
| M5 | Profiles and settings | done; not yet tried in a browser |
| M6 | Images (posts and avatars) | done; avatar and post photo confirmed on SILO |
| M7 | Blocks and reports | done; not yet tried in a browser |
| M8 | Admin and moderation | done; not yet tried in a browser |
| M8b | Staff listings and richer report cards (backend patch 14) | done; not yet tried in a browser |
| M9 | Polish and release | **next** |

## Checks (latest)

`typecheck` clean, `lint` clean, **227 tests pass**, production build OK (about 500 kB, 156 kB gzipped).

## Run

```bash
cd FRONTEND/app
npm install
npm run dev        # also: npm test | npm run typecheck | npm run lint | npm run build
```

## Done: backend patch 14 and frontend M8b

Backend patch 14 (staff listings and report targets) is implemented and the regenerated `openapi.json` and `api_model.md` match its spec. The frontend now uses it (issues N9 and N10 are resolved):

- **Report cards** show who wrote the reported post or comment (a link when the account is active, a "Suspended" badge when not), open the **post of a reported comment**, and let admins **suspend or reinstate the author** straight from a post or comment report. Every report by the same author updates at once.
- **Hidden section** in `/admin` (moderators and admins): hidden posts and hidden comments, newest first, paged, each with its author, an Open post link and **Unhide**, so content hidden from a menu can be found again without a report. Admins also get Suspend or Reinstate author.
- **People section** (admins only; moderators typing `?view=people` just see the reports): suspended accounts by default, an Active toggle, and a username search (waits for a pause, needs 2 or more letters). Suspend (with confirmation) and Reinstate from the list; admins and yourself get no button, matching the API.
- The moderation checklist is `moderation-test-script.md` (updated for these screens).

## Next up (M9: polish and release)

1. **Sessions:** refresh the access token shortly before it expires and when the tab regains focus (issue N4); show "You were signed out" when a lost refresh response ends the session (issue B2).
2. **Accessibility pass:** keyboard walk of every screen, focus order, labels, contrast once the colour is chosen, screen-reader check of dialogs and menus, reduced motion.
3. **Resilience:** an error boundary with a friendly screen, a not-found page that keeps the navigation, offline message.
4. **Performance:** route-level code splitting (the bundle is about 560 kB, 170 kB gzipped), lazy-load the admin and settings screens.
5. **Text:** move user-facing strings into one file (prepares translation).
6. **Browser test:** one Playwright test of register-free login, refresh and logout in Chromium and Firefox (issue A1), plus Safari by hand.
7. **Release notes:** production build, the same-site layout (one hostname or two subdomains, see `Plan.md` section 8), the `FRONTEND_BASE_URL` and CORS settings, cache headers for the static files, a favicon and share image (needs the swan).
8. **Colour and logo:** accent and spark are still plain ink; the swan is still to come.

## Needs the owner

| What | Why |
|---|---|
| Swan logo and its colours | Accent and spark are still plain ink (TEMP in `src/index.css`) |
| Confirm real text limits (issue N1) | UI uses 2000 / 1000 / 60 / 300; OpenAPI shows 8000 / 4000 / 200 / 1000. One line in `src/lib/limits.ts` |
| Read email link format from `MailTemplates.java` (issue A2) | App assumes `?token=` |
| Approve or replace the icon set | `lucide-react` is a placeholder |
| Try in the browser: scroll past one page, delete own post, moderator deletes another's, like and unlike, add and delete a comment, open `/posts/<id>`, open a profile, edit name and bio in settings, change theme, "Log out everywhere" | Covered by tests only so far |
| Check that the private bucket is empty after a post photo is processed (`storage-setup.md`) | The post photo itself works (confirmed 2026-11-18) |
| Rotate the SILO access key, the Gmail app password and the database password that were pasted into chats | Housekeeping from patch 13; the public site makes it more urgent |
| Send the Network-tab error for the image on `localhost:5173` | Needed to explain why photos do not show there |
| Try a phone photo (HEIC or large JPEG): the browser-side conversion is untested in automation | Avatar and a post photo worked; a photo taken on a phone (rotation, HEIC) is still to try |
| Try block, unblock (Settings), and report: from a post, a comment and a profile | Covered by tests only |
| Try moderation with a **moderator** and an **admin** account, following `moderation-test-script.md` (set the role in the database), now including the Hidden and People sections: the Moderation link, the queue, hide and unhide, resolve, suspend and reinstate, and "Hide (staff)" from the post menu | Covered by tests only. A student must see no Moderation link and a not-found page at `/admin` |

## Known gaps in the frontend (not bugs in the API)

- Photo upload shows stages (preparing, uploading, checking) but no percentage bar.
- A blocked person's profile answers 404, so unblocking is only possible from Settings.
- No way to remove a profile photo (the API only accepts a new upload id).
- Animated GIFs become still JPEGs; transparent PNGs get a white background.
- No proactive token refresh before expiry (issue N4); a 401 triggers it instead.
- A lost refresh response signs the user out with no message (issue B2).
- User-facing text is inline, not in one strings file.
- No route-level code splitting yet.
- Firefox and Safari untested for the cookie flow.
- Uploaded photos do not show on `http://localhost:5173` (they do on the public domain and on a phone); cause not yet found.
- The public site is the Vite **development** server, not a production build.

## Where things are

| What | Where |
|---|---|
| App code | `FRONTEND/app/` |
| Design sources (logo, fonts, colours) | `FRONTEND/Assets/` |
| Plan (stable) | `docs/frontend/Plan.md` |
| Moderation test script | `docs/frontend/moderation-test-script.md` |
| Backend patch 14 (staff listings and report targets) | `docs/dev_log/PATCHES/patch-14-staff-listings-and-report-targets.md` |
| API contract | `docs/frontend/api_model.md`, `openapi.json`, `errors.md` |
| Design decisions | `docs/frontend/brand.md` (token locations are listed in its section 8, if present) |
| Issues and quirks | `docs/frontend/frontend-integration-notes.md` |
| Public domain, tunnel, media hostname | backend `docs/public-access-cloudflare.md` |
| Go-live checklist | backend `docs/go-live-checklist.md` |
| Storage setup (SILO locally; R2, AWS S3 or MinIO possible) | `docs/frontend/storage-setup.md`, backend `docs/silo-setup.md` |
| History | `docs/frontend/dev_log/` |
