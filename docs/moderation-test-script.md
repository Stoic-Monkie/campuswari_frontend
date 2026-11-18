# Moderation test script

For trying the moderation screens by hand. Use four accounts (any college emails you can read; `mail.mode: log` is fine): **Reporter** (student), **Offender** (student), **Mod** (moderator), **Admin** (admin). Verify each email first.

## 1. Make the staff accounts

Roles are set by SQL (no endpoint can change a role). Use the database container as in `RUNBOOK.md` section on the first admin:

```sql
UPDATE users SET role = 'MODERATOR' WHERE email = 'mod@college.edu';
UPDATE users SET role = 'ADMIN'     WHERE email = 'admin@college.edu';
```

The role is read from the database on every call, so it takes effect immediately; reload the app so it fetches your profile again (the app keeps it for up to 5 minutes). Check the column names in `V1__users.sql` if the statement fails.

## 2. What each role should see

| Check | Expected |
|---|---|
| Student: look at the bottom or side navigation | No Moderation link |
| Student: open `/admin` | "Nothing here", the same page as any unknown address |
| Mod and Admin: navigation | A shield "Moderation" link |

## 3. Reports

1. Offender posts a few things (one with text a moderator should hide) and comments on someone's post.
2. Reporter reports the post (three dots, Report post, pick a reason, add a note), a comment, and the Offender's profile.
3. Reporter reports the same post again: the dialog still says thanks (the API returns the original).
4. Mod opens Moderation: three open reports, oldest first, each with reason, preview, reporter and a status badge.

## 4. Actions

| Step | Expected |
|---|---|
| Mod: Open post on the post report | The post page opens |
| Mod: Hide post | Status becomes Hidden, button becomes Unhide post; Offender's post is gone from everyone's feed |
| Reporter: reload the feed | The hidden post is not shown |
| Mod: Unhide post | Visible again |
| Mod: Hide comment | Comment disappears from the post; the post's comment count drops by one |
| Mod: Mark actioned on the post report | It leaves Open; under Actioned it shows who resolved it and when |
| Mod: Dismiss the comment report | It leaves Open; under Dismissed |
| Mod: look at the person report | "Only admins can suspend accounts" |
| Two moderators resolve the same report | The second sees "Somebody already resolved this report" |
| Mod: three dots on someone else's post, Hide post (staff) | Hides without needing a report |

## 5. Admin only

| Step | Expected |
|---|---|
| Admin: Suspend account on the person report | Confirmation, then status Suspended and button becomes Reinstate |
| Offender (already signed in): use the app | Signed out on the next request (suspended accounts get 401) |
| Offender: try to log in | The same "incorrect email or password" message as a wrong password |
| Everyone: look at the Offender's profile, posts, comments | Gone (404) |
| Admin: Reinstate account | Active again; Offender can log in; content returns |
| Admin: try to suspend yourself or another admin | "You can't suspend yourself" or "Admins can't be suspended" |

## 6. Hidden content (backend patch 14)

| Step | Expected |
|---|---|
| Mod: three dots on the Offender's post, Hide post (staff), with **no report** | Confirms, then the post leaves everyone's feed |
| Mod: Moderation, **Hidden**, Posts | The post is listed with its author, text and counts, newest first |
| Mod: Open post | The hidden post opens (moderators can still see it) |
| Mod: Unhide post | It leaves the Hidden list and is back in the feed |
| Mod: hide a comment, then Hidden, Comments | The comment is listed with an Open post link; Unhide brings it back |
| Admin: Hidden, a post whose author is active | Suspend author, with a confirmation; afterwards the card shows Reinstate author |
| Mod: Hidden | No Suspend author button (admins only) |

## 7. Richer reports (backend patch 14)

| Step | Expected |
|---|---|
| Report on a comment: Open post | Opens the comment's post |
| Any post or comment report | "Written by @offender", a link while the account is active |
| Admin: Suspend author on a post report | After confirming, every report by that author shows "Suspended" and Reinstate author |
| A report whose post was deleted | No author line and no author buttons |
| Report on a person | "Person: @offender" |

## 8. People (admin only)

| Step | Expected |
|---|---|
| Admin: Moderation, **People** | Suspended accounts first, with Reinstate account |
| Toggle Active, type two or more letters | Matching accounts after a short pause; one letter does nothing |
| An admin account and yourself in the list | No suspend button ("Admins can't be suspended", "This is you") |
| Suspend an active account, then switch to Suspended | They moved lists |
| Mod: open `/admin?view=people` by typing it | Shows the reports instead, no People section |

Record anything that behaves differently in `docs/frontend/frontend-integration-notes.md` and tell me.
