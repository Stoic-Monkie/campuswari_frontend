# Public access via Cloudflare Tunnel (campuswari.xyz)

Date: 2026-11-17. Replaces `setting_up_cloudflare.md` and `frontend_inftastructue.md`, which overlapped and
disagreed (for example on `changeOrigin`). Configuration only: no Java changed.

Status key used below: **Done** = confirmed working or confirmed in a config file. **To confirm** = written in an
older doc but not visible in the current config files. **Open** = known problem, not yet fixed.

## 1. Summary

The local development stack is exposed to the internet on a custom domain through a Cloudflare Tunnel, with no
router port forwarding and no local certificates. Login works on `https://www.campuswari.xyz`. **Media (photos)
does not yet work over the public domain** (see section 8).

All services run on one Debian machine:

| Service | Address |
|---|---|
| Vite dev server (React frontend) | `localhost:5173` |
| Spring Boot API | `localhost:8080` (actuator on `8081`) |
| PostgreSQL | `localhost:5432` |
| SILO S3 API / console | `127.0.0.1:9000` / `localhost:9001` |

## 2. Architecture

```text
[Browser]
   | HTTPS
   v
[Cloudflare edge]  (SSL mode: Flexible)
   | Cloudflare Tunnel (outbound only)
   v
[cloudflared systemd service on Debian]
   | HTTP
   v
[Vite dev server :5173]
   | /api proxy (changeOrigin: true)
   v
[Spring Boot API :8080] ---> PostgreSQL :5432
                        ---> SILO :9000 (S3 API)
```

Only the frontend is published through the tunnel. The browser reaches the API through Vite's `/api` proxy, so
the page and the API share one origin. **SILO is not published**, which is the cause of the open media problem.

## 3. Domain and DNS (Done)

- Registrar: GoDaddy. DNS provider: Cloudflare (free plan).
- GoDaddy nameservers were replaced with the two Cloudflare nameservers assigned to the account. Domain status
  in Cloudflare is **Active**.

## 4. Tunnel (Done)

- Tunnel name: `campuswaritunnel`, installed as a systemd service so it starts on boot:

```bash
sudo cloudflared service install <TUNNEL_TOKEN>
```

Public hostnames in the tunnel dashboard:

| Hostname | Service |
|---|---|
| `campuswari.xyz` (`@`) | `http://localhost:5173` |
| `www.campuswari.xyz` | `http://localhost:5173` |

Cloudflare flattens the CNAME on the root domain automatically.

## 5. Cloudflare SSL/TLS (Done)

Mode set to **Flexible** (Dashboard, SSL/TLS, Overview). It was changed after Error 525 appeared: the origin is
plain HTTP, so Cloudflare must not try HTTPS to it. Browser to Cloudflare is HTTPS; Cloudflare to the machine
is HTTP.

## 6. Frontend: `FRONTEND/app/vite.config.ts` (Done)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,                       // listen on 0.0.0.0 so the tunnel can reach it
    port: 5173,
    allowedHosts: [                   // without this Vite shows "Blocked request"
      "campuswari.xyz",
      "www.campuswari.xyz",
      ".campuswari.xyz",
    ],
    hmr: { protocol: "wss", clientPort: 443 },   // live reload over the HTTPS tunnel
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false },
});
```

`changeOrigin` is `true` in the final version. The earlier doc said `false`; the later troubleshooting entry
(API requests not routing) is the one that reflects the fix.

## 7. Backend: `src/main/resources/application-local.yaml` (Done)

Only these two groups of settings differ from a plain localhost setup. Property paths are the real ones from
`application.yaml` (they sit under `app:`).

```yaml
app:
  mail:
    frontend-base-url: https://campuswari.xyz      # used in verification and reset links
  security:
    cors:
      allowed-origins: http://localhost:3000,http://localhost:5173,https://campuswari.xyz,https://www.campuswari.xyz
```

Rules from `application.yaml`: origins must be exact (scheme and host, no trailing slash) and no wildcard.
`www` and the bare domain are different origins, so both are listed.

**Side effect:** with `frontend-base-url` on the public domain, email links open the public site even when you
test from `localhost:5173`. Switch it back temporarily when testing email flows locally.

The Spring Boot server reads this file only at startup: restart it after every change.

### To confirm (in the old docs, not in the current config)

The older document lists these under a top-level `server:` / `security:` block. They are not in the files you
pasted, and the paths do not match this project's layout:

| Old doc says | Concern |
|---|---|
| `server.forward-headers-strategy: framework` | `application.yaml` sets `none` and warns against this; the project trusts proxies through `app.abuse.trusted-proxies` (`TRUSTED_PROXIES`) instead. See `patch-06-abuse-protection.md` |
| `server.servlet.session.cookie.same-site: none` and `secure: true` | The app uses its own refresh cookie (`RefreshCookies.java`), not a servlet session cookie, so this may have no effect. Because the browser talks to one origin through the Vite proxy, `SameSite=None` is probably not needed |
| `security.cors...`, `auth...` at top level | Real keys are `app.security.cors...` and `app.auth...` |

Please say whether you actually added the first two to a file. If you did, we document where; if not, they are
dropped. Also check the refresh cookie is sent with the `Secure` flag when served over HTTPS.

**Rate limiting question:** every request reaches the API from `localhost` (cloudflared, then Vite). Unless
`TRUSTED_PROXIES` is set, per-IP limits will treat all visitors as one client. Fine for testing; to be decided
before real users.

## 8. Media over the public domain (Open)

Background: the browser uploads a photo with a `PUT` **directly to the storage address inside the upload link**,
and posts show images from `public-base-url`. In `application-local.yaml` both come from `siloUrl` in
`secrets/silo/silo_acess.json`, which is `http://127.0.0.1:9000` (`docs/silo-setup.md` says the same address is
used for API calls and for the links handed to the browser).

Likely cause (to be confirmed with the browser Network tab): for a visitor on `https://www.campuswari.xyz`,
`127.0.0.1:9000` is the visitor's own computer, and an HTTPS page also cannot load plain-HTTP resources. That
would explain why login works but media does not, and why media works for you on `localhost:5173`.

Already checked: SILO's own **Cors Allow Origin** (Console, Settings, Configuration, API) is `*`, so CORS in
SILO is not expected to be the blocker.

Options, pending confirmation (not yet chosen):

1. **Second tunnel hostname for SILO**, for example `media.campuswari.xyz` to `http://localhost:9000`, and set
   `siloUrl` in the key file to `https://media.campuswari.xyz`. No code change. The API would also reach SILO
   through the internet, and the SILO API becomes public (anonymous rules and keys then matter more).
2. **Separate internal and public storage addresses** in the backend (API uses `127.0.0.1:9000`, links and
   `public-base-url` use the public name). Needs a code patch in `S3ObjectStorage` / `MediaProperties`.

Information needed to confirm: the failing URL and error shown in DevTools, Network tab, on the live site for
(a) uploading a photo and (b) viewing an existing post with a photo.

## 9. Operational notes

1. You can use `http://localhost:5173` and `https://campuswari.xyz` at the same time.
2. Restart the Java server after changing backend config. Vite picks up `vite.config.ts` changes on restart.
3. You can close terminals: the `cloudflared` service keeps the domain up while the machine is on and online.
4. This exposes the **Vite development server** and the **local** profile. It is for testing and demos only.

## 10. Troubleshooting log

| Symptom | Cause | Resolution |
|---|---|---|
| Error 1016 (Origin DNS error) | No DNS record for the root domain; only `www` existed | Added the `@` record pointing at the tunnel |
| Error 525 (SSL handshake failed) | Cloudflare tried HTTPS to an HTTP-only origin | SSL/TLS mode set to Flexible |
| "Blocked request", black screen | Vite blocked the unknown host | Added the domains to `server.allowedHosts` |
| Login worked locally, failed on the domain | Origin not allowed by CORS | Added the public origins to `app.security.cors.allowed-origins` |
| API calls not routed through Vite | Wrong Host header forwarded | `changeOrigin: true` |
| Domain order pending | GoDaddy delayed provisioning after a UPI payment | Waited for payment verification |
| Photos fail on the public site | SILO address is local-only (section 8) | Open |

## 11. Before production

1. `npm run build` and serve the static files (Nginx or Caddy) instead of Vite; point the tunnel at that.
2. Run the API as a jar with the `prod` profile and environment variables; set `TRUSTED_PROXIES` correctly.
3. Use **Full (Strict)** SSL if the origin has a valid certificate.
4. Decide the storage address design (section 8) and update `compose.yaml`, `deploy/compose.yaml` and
   `startup-kit/Docker/env`, which still use the old variables (`patch-13` open items).
5. Restrict CORS and SILO origins to the real domain only.

## 12. Security housekeeping

- The Gmail app password in `application-local.yaml` and the SILO access key have been pasted into chats: revoke
  and replace both, then re-import the SILO key with `scripts/import-silo-key.sh --force`.
- Keep `secrets/` and `application-local.yaml` out of git (`git check-ignore -v`).
