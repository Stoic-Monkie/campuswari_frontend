import { useState } from "react";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { staffActionError } from "./staffErrors";
import { useReinstateUser, useSuspendUser } from "./useStaffActions";

interface AuthorActionsProps {
  authorId: string;
  username: string;
  /** The account's live status: ACTIVE or SUSPENDED. Anything else shows no buttons. */
  status: string | null | undefined;
  /** "author" on posts and comments, "account" on people. */
  noun: "author" | "account";
}

/** Suspend or reinstate an account (admins only; render it only for admins). Suspending asks first. */
export function AuthorActions({ authorId, username, status, noun }: AuthorActionsProps) {
  const suspend = useSuspendUser();
  const reinstate = useReinstateUser();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = suspend.isPending || reinstate.isPending;

  return (
    <>
      {status === "ACTIVE" ? (
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Suspend {noun}
        </Button>
      ) : null}
      {status === "SUSPENDED" ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setError(null);
            reinstate.mutate(authorId, { onError: (e) => setError(staffActionError(e, "reinstate")) });
          }}
        >
          Reinstate {noun}
        </Button>
      ) : null}
      {error && !confirming ? (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title={`Suspend @${username}?`}
          message="They are logged out at once and can’t log in until reinstated. Their posts and comments disappear. This is recorded in the audit log."
          confirmLabel="Suspend"
          busy={suspend.isPending}
          error={error}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            suspend.mutate(authorId, {
              onSuccess: () => setConfirming(false),
              onError: (e) => setError(staffActionError(e, "suspend")),
            })
          }
        />
      ) : null}
    </>
  );
}
