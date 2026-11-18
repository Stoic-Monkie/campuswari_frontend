# Step 08: admin and moderation (M8)

Date: 2026-11-19. Status: done. Covered by tests; not yet tried in a browser.

## What was built

- **Moderation screen** `/admin` (staff only): report queue with tabs Open (default), Actioned, Dismissed (kept in the address as `?status=`), oldest first, paged, refresh button, all-clear and error states.
- **Report card:** target type, reason and the target's current status as badges; the reported text as plain text (never HTML); the reporter's note and `@reporter` (links to their profile); who resolved it and when for closed reports.
- **Actions:** Hide or Unhide a post or comment (flips with the target status), Open post (posts only), Dismiss and Mark actioned (resolve; the row leaves the open queue at once, a 409 says somebody already resolved it), Suspend (with confirmation) and Reinstate for **admins only**; moderators see "Only admins can suspend accounts". No hide button for deleted content.
- **Staff items in the existing "More options" menu:** moderators get "Hide post (staff)" and "Hide comment (staff)" wherever they see the content; admins get "Suspend @name (admin)" on profiles. All with a confirmation that mentions the audit log.
- **Guard:** `StaffOnly`. Students (and anyone whose role is not staff) see the ordinary "Nothing here" page, so the screen is not advertised; while the profile loads a short "Loading" is shown instead of a flash. A "Moderation" link (shield icon) appears in the navigation for staff only. The role comes from `GET /api/users/me`; the server still checks every call.
- **Caches:** hiding removes a post from every list and the comment from comment lists (or reloads them); suspending removes the person's content everywhere; unhide and reinstate reload what we hold; every report about the same target shows its new status at once.
- Endpoints: `listReports`, `resolveReport`, `hidePost`, `unhidePost`, `hideComment`, `unhideComment`, `suspendUser`, `reinstateUser`. `SafetyMenu` now calls `onRemoved` (renamed from `onBlocked`) after block, hide or suspend.

## Decisions

- Hide and suspend need a confirmation in the menu; in the queue Hide is a single click (it is reversible from the same card) and Suspend asks.
- Staff error messages follow the server's refusals: 409 already resolved, 400 cannot suspend yourself, 403 admins cannot be suspended, 404 item gone.
- Status labels (Visible, Hidden, Deleted, Active, Suspended) are inferred from the backend logs; any other value is shown as received.

## Gaps found (recorded as issues N9 and N10)

- Staff cannot list hidden content or suspended accounts: unhiding is only possible from a report row.
- A report row identifies a comment or person only by id and preview, so staff cannot jump to them.

## Checks

195 tests (39 new): roles; staff error wording; admin caches; queue (list, plain-text preview, tabs, address param, empty, paging, error retry); resolving (actioned, dismissed, 409); acting on content (hide then unhide, comment hide, open-post link, deleted target, failed hide); accounts (moderator note, admin suspend and reinstate, refused suspension); staff guard (staff, student, loading); staff menu items (students, moderators, admins, confirmation, endpoints, failure); navigation link for staff only. Typecheck, lint, build clean.

## Not yet verified in a browser

Everything above with real moderator and admin accounts (roles are set in the database; there is no role-management UI or API yet).
