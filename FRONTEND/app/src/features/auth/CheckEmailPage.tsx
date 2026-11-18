import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { resendVerification } from "../../api/endpoints/auth";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { TextField } from "../../components/TextField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { useCooldown } from "../../lib/useCooldown";

interface LocationState {
  email?: string;
  /** True right after registering: a link was just sent, so the resend button starts on cooldown. */
  justSent?: boolean;
}

export function CheckEmailPage() {
  const state = (useLocation().state ?? {}) as LocationState;
  const [email, setEmail] = useState(state.email ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown(state.justSent ? 60 : 0);

  const mutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => {
      setSent(true);
      setError(null);
      cooldown.start(60);
    },
    onError: (e) => {
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      setError(describeError(e));
    },
  });

  const canResend = email.trim().length > 0 && !mutation.isPending && cooldown.remaining === 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Check your email</h1>
      <p className="text-sm">
        {state.email ? (
          <>
            We sent a link to <strong className="font-medium">{state.email}</strong>. Open it to confirm
            your account, then log in.
          </>
        ) : (
          "Open the link we emailed you to confirm your account, then log in."
        )}
      </p>
      <p className="text-sm text-muted">
        Can’t find it? Check spam. Unconfirmed accounts are removed after 7 days.
      </p>

      {error ? <FormAlert>{error}</FormAlert> : null}
      {sent ? (
        <FormAlert tone="success">If that account still needs confirming, a new link is on its way.</FormAlert>
      ) : null}

      {!state.email ? (
        <TextField
          label="College email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      ) : null}

      <Button variant="secondary" disabled={!canResend} onClick={() => mutation.mutate(email.trim())}>
        {mutation.isPending
          ? "Sending…"
          : cooldown.remaining > 0
            ? `Send again in ${cooldown.remaining}s`
            : "Send the link again"}
      </Button>

      <Link to="/login" className="text-sm underline">
        Back to log in
      </Link>
    </div>
  );
}
