import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../api/endpoints/auth";
import { ApiError, ErrorCode } from "../../api/errors";
import { FormAlert } from "../../components/FormAlert";
import { describeError } from "../../lib/errorMessages";
import { Button } from "../../components/Button";
import { TOKEN_PARAM } from "./links";

/** The emailed link opens this page; the page POSTs the token (a GET link would be burned by mail scanners). */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get(TOKEN_PARAM);
  const started = useRef(false);

  const mutation = useMutation({ mutationFn: verifyEmail });
  const { mutate } = mutation;

  useEffect(() => {
    // The token is single use: guard against React StrictMode running this twice in dev.
    if (!token || started.current) return;
    started.current = true;
    mutate(token);
  }, [token, mutate]);

  if (!token) {
    return (
      <Result title="This link is incomplete">
        <p className="text-sm text-muted">Open the link from your email again, or request a new one.</p>
        <Link to="/check-email" className="text-sm underline">
          Send a new link
        </Link>
      </Result>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Result title="Email confirmed">
        <p className="text-sm text-muted">You’re all set. Log in to continue.</p>
        <Link to="/login">
          <Button className="w-full">Log in</Button>
        </Link>
      </Result>
    );
  }

  if (mutation.isError) {
    const e = mutation.error;
    if (e instanceof ApiError && e.code === ErrorCode.InvalidToken) {
      return (
        <Result title="This link has expired">
          <p className="text-sm text-muted">
            The link is invalid, already used, or too old. Request a new one and try again.
          </p>
          <Link to="/check-email" className="text-sm underline">
            Send a new link
          </Link>
          <Link to="/login" className="text-sm underline">
            Back to log in
          </Link>
        </Result>
      );
    }
    return (
      <Result title="Couldn’t confirm your email">
        <FormAlert>{describeError(e)}</FormAlert>
        <Button variant="secondary" onClick={() => mutate(token)}>
          Try again
        </Button>
      </Result>
    );
  }

  return (
    <Result title="Confirming your email…">
      <p className="text-sm text-muted" role="status">
        One moment.
      </p>
    </Result>
  );
}

function Result({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">{title}</h1>
      {children}
    </div>
  );
}
