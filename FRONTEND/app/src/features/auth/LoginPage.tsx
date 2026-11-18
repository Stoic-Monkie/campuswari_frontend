import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { login } from "../../api/endpoints/auth";
import { ApiError, ErrorCode } from "../../api/errors";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { PasswordField } from "../../components/PasswordField";
import { TextField } from "../../components/TextField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { useCooldown } from "../../lib/useCooldown";
import { useSession } from "../../session/SessionProvider";
import { emailField } from "./validation";

const schema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

interface LocationState {
  from?: { pathname?: string; search?: string };
  notice?: "password-reset";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { signIn } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (auth) => {
      signIn(auth);
      const dest = state.from?.pathname ? `${state.from.pathname}${state.from.search ?? ""}` : "/";
      navigate(dest, { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === ErrorCode.EmailNotVerified) {
        navigate("/check-email", { state: { email: getValues("email").trim() } });
        return;
      }
      if (e instanceof ApiError && e.status === 401) {
        setServerError("Incorrect email or password.");
        return;
      }
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      if (import.meta.env.DEV && !isRateLimited(e)) console.warn("Login failed", e);
      setServerError(describeError(e));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    mutation.mutate({ email: values.email, password: values.password });
  });

  const blocked = mutation.isPending || cooldown.remaining > 0;

  return (
    <div>
      <h1 className="mb-4 text-lg font-medium">Log in</h1>
      {state.notice === "password-reset" ? (
        <div className="mb-4">
          <FormAlert tone="success">Your password was changed. Log in with the new one.</FormAlert>
        </div>
      ) : null}
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
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={blocked}>
          {mutation.isPending ? "Logging in…" : cooldown.remaining > 0 ? `Wait ${cooldown.remaining}s` : "Log in"}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link to="/register" className="underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
