# Step 08b: moderation gaps and the patch 14 spec

Date: 2026-11-19. Status: documentation only; no code changed.

The owner ran the tests (195 pass), has not yet created moderator or admin accounts, will test moderation by hand, and asked to address the two gaps found in step 08.

## What was done

- **Patch 14 spec** written in the backend's patch format (`PATCHES/patch-14-staff-listings-and-report-targets.md`, status: proposed). Closes N9 (staff cannot list hidden content or suspended accounts) with three read-only listings (`/api/admin/posts`, `/comments`, `/users`, the last admin-only with username search) and N10 (reports say too little about their target) with four optional fields on `ReportResponse`. No table changes, one index-only migration (`V7`), about 20 tests listed.
- **`moderation-test-script.md`:** four accounts, the SQL to make a moderator and an admin, and a table of what each role should see and do, including the two known gaps as deliberate checks.
- Issue notes N9 and N10 point to patch 14; `Status.md` has a "Waiting on the backend" section.

## Why a spec and not code

The Java code was never shared, so table and column names are placeholders. Two ways forward: implement from the spec, or paste `AdminController`, `ModerationService`, `ReportRepository`, `ReportResponse`, `PostRepository` (the feed query), `Cursor` and `StaffGuard` and an exact diff can be written.

## Next

Frontend M8b after patch 14 and a regenerated `openapi.json`; M9 can go first.
