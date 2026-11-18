# CampusWari

A campus social network for college students. Students sign up with their college email, post text and one image, browse a campus feed, comment, like, block and report. Moderators and admins review reports and hide content or suspend accounts.

This repository holds the whole project: the **API** (Spring Boot, in `src/`), the **web app** (React, in `FRONTEND/`), deployment files and all documentation.

## Status

| Part | State |
|---|---|
| API | Patches 0 to 11b done: auth, posts, comments, likes, blocks, reports, moderation, image uploads, cleanup jobs, Docker packaging. Next: Patch 11c (key rotation, `SECURITY.md`, OpenAPI, dependency scan) |
| Web app | Planning. `FRONTEND/` is still empty. Plan and API reference are in `docs/frontend/` |
| Deployment | Docker compose on one machine with an optional Cloudflare Tunnel. Not yet run end to end (see the checklist in `docs/RUNBOOK.md`, section 10) |

The detailed, always-current state is in [`docs/dev_log/status.md`](docs/dev_log/status.md).

## How it fits together

```
 Browser (React app, FRONTEND/)
        |  HTTPS, JSON, access token in memory,
        |  refresh token in an httpOnly cookie
        v
 Cloudflare Tunnel (optional)  ->  Spring Boot API (port 8080)  ->  PostgreSQL
                                          |
                                          +-> Cloudflare R2 (images: private incoming bucket, public clean bucket)
                                          +-> Gmail SMTP (verification and reset emails)
```

- **Auth:** email and password, JWT access tokens (ES256, 15 minutes) and rotating single-use refresh tokens (14 days). Email must be on an allowed college domain and verified before login.
- **Images:** the browser uploads straight to R2 with a signed URL; the API re-encodes the image (EXIF removed, at most 2048 px) before it is made public.
- **Abuse protection:** per-IP and per-account rate limits, 64 KB JSON body limit, strict CORS, hidden lockouts.
- **Moderation:** students, moderators and admins. Blocks are invisible to the blocked person.

## Repository layout

```
CampusWari/
├── src/                  API source code and tests (Java 21, Spring Boot)
├── FRONTEND/             Web app source code (React + TypeScript + Vite). Code only
├── docs/
│   ├── PLAN.md           API plan and design decisions
│   ├── RUNBOOK.md        Deploy, backups, secrets, troubleshooting
│   ├── dev_log/          status.md and one log per API patch (PATCHES/)
│   ├── frontend/         Frontend docs: Plan.md, api_model.md
│   └── ISSUE/            Known issues and quirks to fix later
├── deploy/               compose.yaml and .env.example for the Docker stack
├── scripts/              backup.sh, restore.sh
├── startup-kit/          Templates for the files that are not in git (see below)
├── secrets/              Signing keys (gitignored, never commit)
├── Dockerfile            API image
├── generate-keys.sh      Creates the JWT signing keys in secrets/
├── pom.xml, mvnw         Maven build
└── zip/                  Old zip snapshots (not part of the project)
```

Rule of thumb: **code in `src/` and `FRONTEND/`, documents in `docs/`.**

## Documentation map

| I want to... | Read |
|---|---|
| Know where the project stands and what to do next | [`docs/dev_log/status.md`](docs/dev_log/status.md) |
| Understand why the API is built this way | [`docs/PLAN.md`](docs/PLAN.md) and the patch logs in `docs/dev_log/PATCHES/` |
| Deploy, back up, rotate secrets, fix a problem | [`docs/RUNBOOK.md`](docs/RUNBOOK.md) |
| Build or change the web app | [`docs/frontend/Plan.md`](docs/frontend/Plan.md) |
| Look up an endpoint, request or error | [`docs/frontend/api_model.md`](docs/frontend/api_model.md) |
| See known problems and API quirks | [`docs/ISSUE/frontend-integration-notes.md`](docs/ISSUE/frontend-integration-notes.md) |
| Set up the files that are not in git | [`startup-kit/`](startup-kit/) |

The field-level details in `api_model.md` are partly inferred from the patch logs; its section 9 lists what still has to be checked against the real DTOs.

## Run the API locally (without Docker)

Needs Java 21 and PostgreSQL.

```bash
./generate-keys.sh                                   # creates secrets/ec-private.pem and ec-public.pem
cp startup-kit/local-no-docker/application-local.yaml src/main/resources/application-local.yaml
# edit the copy: set the database password (create the database and user first)
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
./mvnw clean verify                                  # run the tests
```

Full steps (creating the database, mail and image modes) are in [`startup-kit/local-no-docker/README.md`](startup-kit/local-no-docker/README.md). With the template, emails are written to the log instead of being sent, and images are not stored, so no Gmail or Cloudflare account is needed.

## Run the API with Docker

```bash
cp startup-kit/Docker/env deploy/.env && chmod 600 deploy/.env   # then fill in every <set-me...>
cd deploy
docker compose up -d --build                      # database + API
docker compose --profile tunnel up -d --build     # ... plus the Cloudflare Tunnel
```

Details, backups and troubleshooting: [`startup-kit/Docker/README.md`](startup-kit/Docker/README.md) and [`docs/RUNBOOK.md`](docs/RUNBOOK.md). The `prod` profile refuses to start with unsafe settings (log mail mode, in-memory media, non-https URLs).

## Run the web app

Not built yet. When `FRONTEND/` exists:

```bash
cd FRONTEND
npm install
npm run dev        # http://localhost:5173, proxies /api to http://localhost:8080
```

The local API must allow the dev origin: add `http://localhost:5173` to `app.security.cors.allowed-origins` in `application-local.yaml` (the template already does).

## Files that are not in git

| File | Purpose | Template |
|---|---|---|
| `src/main/resources/application-local.yaml` | Local development settings | `startup-kit/local-no-docker/` |
| `deploy/.env` | Docker stack settings and credentials | `startup-kit/Docker/env` or `deploy/.env.example` |
| `secrets/ec-private.pem`, `secrets/ec-public.pem` | JWT signing keys | `./generate-keys.sh` |

**This repository is public.** Real passwords, keys and tokens go only into the gitignored copies, never into templates, docs or commits.

## Conventions

- **Patches.** The API grew in numbered patches; each has a log in `docs/dev_log/PATCHES/` (what was added, why, known limits). Update `status.md` after every patch.
- **Frontend milestones.** The web app follows milestones M0 to M9 in `docs/frontend/Plan.md`. Each ends with something you can run and check.
- **Issues.** Things to fix later go in `docs/ISSUE/`, with an ID, severity and owner, so they are not kept in memory.
- **Errors.** The API returns `application/problem+json` with a stable code. Clients branch on the code, never on the text.

## License

See [`LICENSE`](LICENSE).
