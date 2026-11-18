import { useState } from "react";
import { Link } from "react-router-dom";
import type { AccountStatus } from "../../api/endpoints/admin";
import type { StaffUser } from "../../api/schemas";
import { Avatar } from "../../components/Avatar";
import { TextField } from "../../components/TextField";
import { LIMITS } from "../../lib/limits";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useMe } from "../me/useMe";
import { AuthorActions } from "./AuthorActions";
import { statusLabel } from "./labels";
import { StaffList } from "./StaffList";
import { useStaffUsers } from "./useStaffLists";

const badge = "rounded-full border border-line px-2 py-0.5 text-xs";

function PersonRow({ user, meId }: { user: StaffUser; meId: string | undefined }) {
  // The API refuses to suspend admins or yourself, so do not offer it.
  const canAct = user.role !== "ADMIN" && user.id !== meId;
  return (
    <article className="rounded-card border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.displayName} src={user.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs text-muted">
            {user.status === "ACTIVE" ? (
              <Link to={`/u/${user.username}`} className="underline">
                @{user.username}
              </Link>
            ) : (
              <>@{user.username}</>
            )}
          </p>
        </div>
        <span className={badge}>{user.role === "STUDENT" ? "Student" : user.role === "MODERATOR" ? "Moderator" : "Admin"}</span>
        <span className={`${badge} text-muted`}>{statusLabel(user.status)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canAct ? (
          <AuthorActions authorId={user.id} username={user.username} status={user.status} noun="account" />
        ) : (
          <p className="text-xs text-muted">{user.role === "ADMIN" ? "Admins can’t be suspended." : "This is you."}</p>
        )}
      </div>
    </article>
  );
}

/** Admins only: suspended accounts, and a username search to find an account without a report. */
export function PeopleView() {
  const me = useMe().data;
  const [status, setStatus] = useState<AccountStatus>("SUSPENDED");
  const [text, setText] = useState("");
  const typed = useDebouncedValue(text.trim(), 300);
  // The API wants 2 to 30 characters; shorter means "no search".
  const q = typed.length >= LIMITS.searchMin ? typed.slice(0, LIMITS.usernameMax) : undefined;
  const query = useStaffUsers(status, q);

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Account status" className="flex gap-2">
        {(["SUSPENDED", "ACTIVE"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === status}
            onClick={() => setStatus(s)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              s === status ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-fg"
            }`}
          >
            {s === "SUSPENDED" ? "Suspended" : "Active"}
          </button>
        ))}
      </div>

      <TextField
        label="Find by username"
        type="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint={`Type at least ${LIMITS.searchMin} letters. Matches the start of the username. Newest accounts first.`}
      />

      <StaffList
        query={query}
        empty={q ? "Nobody matches." : status === "SUSPENDED" ? "No suspended accounts." : "No accounts."}
        render={(u) => <PersonRow user={u} meId={me?.id} />}
      />
    </div>
  );
}
