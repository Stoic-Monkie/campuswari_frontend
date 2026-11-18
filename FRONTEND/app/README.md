# CampusWari web app

React + TypeScript + Vite + Tailwind v4 + TanStack Query. Design decisions: `../Assets/brand.md`. API contract: `docs/frontend/api_model.md`.

## Run

```bash
cd FRONTEND/app
npm install
npm run dev          # http://localhost:5173 (proxies /api to http://localhost:8080)
```

Start the API first (`local` profile). The API checks the `Origin` header on cookie requests, so add
`http://localhost:5173` to `CORS_ALLOWED_ORIGINS` for the local profile.

## Scripts

`npm run dev` | `npm test` | `npm run typecheck` | `npm run lint` | `npm run build` | `npm run format`

## Where things are

- `src/index.css`: **design tokens** (colours). Edit here; the whole app follows. Open `/design` to see them.
- `src/api/client.ts`: HTTP client with single-flight token refresh (tested).
- `src/api/schemas.ts`: the only file that knows API field names.
- `src/session/`: session provider (restores the session from the refresh cookie on load).
- `src/app/`: providers, router, layout shell.
- `src/pages/`, `src/features/`: screens (placeholders until their milestone).

## Status

Current status is kept in `docs/frontend/Status.md` (overwritten each update); history in `docs/frontend/dev_log/`.
Done: M0 to M8b (scaffold, API client, auth screens, feed and posting, post detail, comments, likes, profiles, settings, photos, blocks and reports, moderation with staff listings). Photos need an S3-compatible store (SILO locally; see `docs/frontend/storage-setup.md`).

## Things to confirm against the backend

- **Email link format.** The app expects `/verify-email?token=...` and `/reset-password?token=...`. The name is set in
  `src/features/auth/links.ts`; the paths are in `src/app/router.tsx`. Check `mail/MailTemplates.java`.
- **Text limits.** The UI validates against the limits in `src/lib/limits.ts` (post 2000, comment 1000, name 60, bio 300),
  taken from the patch logs. `openapi.json` shows larger numbers (8000, 4000, 200, 1000). Confirm which one the
  service enforces and edit that one file.
