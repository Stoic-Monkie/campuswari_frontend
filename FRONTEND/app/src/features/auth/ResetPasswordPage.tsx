import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { resetPassword } from "../../api/endpoints/auth";
import { ApiError, ErrorCode } from "../../api/errors";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { PasswordField } from "../../components/PasswordField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { useCooldown } from "../../lib/useCooldown";
import { TOKEN_PARAM } from "./links";
import { applyFieldErrors, serverDetail } from "./serverErrors";
import { passwordField } from "./validation";

const schema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match" });
type Values = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get(TOKEN_PARAM);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const mutation = useMutation({
    mutationFn: resetPassword,
    // Success ends every session on the server, so send the user to log in fresh.
    onSuccess: () => navigate("/login", { replace: true, state: { notice: "password-reset" } }),
    onError: (e) => {
      if (e instanceof ApiError && e.code === ErrorCode.InvalidToken) {
        setExpired(true);
        return;
      }
      if (applyFieldErrors(e, setError, ["password"])) return;
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      // A weak password keeps the link valid: show the reason and let them retry.
      setServerError(serverDetail(e) ?? describeError(e));
    },
  });

  if (!token || expired) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-medium">{token ? "This link has expired" : "This link is incomplete"}</h1>
        <p className="text-sm text-muted">Request a new reset link to continue.</p>
        <Link to="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit((v) => {
    setServerError(null);
    mutation.mutate({ token, password: v.password });
  });

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium">Choose a new password</h1>
      <p className="mb-4 text-sm text-muted">You’ll be signed out everywhere and asked to log in again.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${LIMITS.passwordMin} characters. Avoid common passwords.`}
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Repeat the password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        <Button type="submit" disabled={mutation.isPending || cooldown.remaining > 0}>
          {mutation.isPending
            ? "Saving…"
            : cooldown.remaining > 0
              ? `Wait ${cooldown.remaining}s`
              : "Change password"}
        </Button>
      </form>
    </div>
  );
}
