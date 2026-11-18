# Step 01: scaffold, design tokens, API client (M0 + M1)

Date: 2026-11-11. Status: done.

## What was built

- Vite + React + TypeScript (strict) + Tailwind v4 project in `FRONTEND/app`. ESLint (flat config), Prettier, Vitest.
- `vite.config.ts`: dev server on 5173, `/api` proxied to `http://localhost:8080`, so the browser sees one origin and the refresh cookie behaves like production.
- `src/index.css`: design tokens as CSS variables for light and dark, mapped to Tailwind colours (`bg`, `card`, `fg`, `muted`, `line`, `accent`, `on-accent`, `spark`, `danger`). **Accent and spark are TEMP (plain ink).**
- Wordmark component (locked pairing: DM Serif Display capitals, Fraunces italic lowercase), fonts bundled with `@fontsource`.
- Theme: system default plus a manual toggle, stored as `cw-theme`; applied before first render.
- Router shell, bottom navigation, `/design` living style guide.
- `src/api/client.ts`: bearer token in memory only; **single-flight refresh**; one retry after a 401; late requests reuse a token that was already replaced; network errors during refresh do not sign out; problem+json parsed into `ApiError` (status, code, detail, field errors, `Retry-After`, `errorId`).
- `SessionProvider`: restores the session from the refresh cookie on page load; listens for "signed out" events.

## Decisions

- Token refresh is single-flight because refresh tokens rotate and are single-use; two at once would look like reuse and kill the session.
- `fetch` is injected into the client so tests need no HTTP mocking library (MSW dropped).
- Icons: `lucide-react` as a placeholder.

## Checks

11 tests (concurrent 401s cause one refresh; sign-out rules; error parsing; 204; public calls skip refresh; wordmark label). Typecheck, lint, build clean.

## Notes

npm installed newer majors than expected (React 19, Vite 8, TypeScript 6, Zod 4, ESLint 10). Everything built without changes.
