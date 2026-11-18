# Step 02: auth screens (M2)

Date: 2026-11-12. Status: done, confirmed in the browser by the owner.

## Inputs

`docs/frontend/openapi.json` and the updated `api_model.md` replaced the guessed shapes. `src/api/schemas.ts` was rewritten from them (all optional fields accepted as null or missing). The full `ErrorCode` enum is in `src/api/errors.ts`. Note the rate-limit code is `RATE_LIMITED`.

## What was built

- Screens: login (cookie delivery), register, check-email (resend with cooldown), verify-email, forgot password, reset password.
- Layouts and guards: `AuthLayout` (signed out), `AppShell` (signed in, with log-out button), `GuestOnly`, `RequireAuth` (remembers the intended path). Desktop gets a left rail, phones a bottom bar.
- Shared pieces: `TextField`, `PasswordField`, `FormAlert`, `Splash`, `useCooldown`, `errorMessages`, `limits`, code-point text counting.
- Forms use React Hook Form + Zod. Server field errors are placed on the matching input; other 400 and 409 errors show the server's text.

## Behaviour decisions

- Registration always ends on "check your email" (the API never reveals whether an email exists).
- Wrong password: one generic message. 403 `EMAIL_NOT_VERIFIED`: go to check-email.
- Rate limits: show the wait and disable the button until it passes.
- Verify page POSTs the token once and guards against React StrictMode double runs.
- Weak new password on reset keeps the form (the link stays valid).
- Usernames are lowercased before sending.

## Assumed, still to confirm

Emailed links open `/verify-email?token=...` and `/reset-password?token=...` (parameter name in `src/features/auth/links.ts`). See issue A2.

## Checks

40 tests at the end of this step. Typecheck, lint, build clean.
