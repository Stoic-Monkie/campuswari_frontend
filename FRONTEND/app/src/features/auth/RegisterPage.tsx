import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { register as registerAccount } from "../../api/endpoints/auth";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { PasswordField } from "../../components/PasswordField";
import { TextField } from "../../components/TextField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { useCooldown } from "../../lib/useCooldown";
import { applyFieldErrors, serverDetail } from "./serverErrors";
import { displayNameField, emailField, passwordField, usernameField } from "./validation";

const schema = z.object({
  email: emailField,
  username: usernameField,
  displayName: displayNameField,
  password: passwordField,
});
type Values = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", displayName: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (_data, vars) => {
      // The API answers the same way whether or not the email already exists.
      navigate("/check-email", { replace: true, state: { email: vars.email, justSent: true } });
    },
    onError: (e) => {
      if (applyFieldErrors(e, setError, ["email", "username", "displayName", "password"])) return;
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      setServerError(serverDetail(e) ?? describeError(e));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    mutation.mutate(values);
  });

  const blocked = mutation.isPending || cooldown.remaining > 0;

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium">Create your account</h1>
      <p className="mb-4 text-sm text-muted">Use your college email. We’ll send a link to confirm it.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <TextField
          label="College email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint={`${LIMITS.usernameMin}–${LIMITS.usernameMax} characters: letters, numbers, underscores. Public.`}
          error={errors.username?.message}
          {...register("username", { setValueAs: (v: string) => v.trim().toLowerCase() })}
        />
        <TextField
          label="Name"
          autoComplete="name"
          hint="Shown on your posts."
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint={`At least ${LIMITS.passwordMin} characters. Avoid common passwords and your own name.`}
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={blocked}>
          {mutation.isPending
            ? "Creating account…"
            : cooldown.remaining > 0
              ? `Wait ${cooldown.remaining}s`
              : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
