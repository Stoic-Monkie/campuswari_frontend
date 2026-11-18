import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { forgotPassword } from "../../api/endpoints/auth";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { TextField } from "../../components/TextField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { useCooldown } from "../../lib/useCooldown";
import { emailField } from "./validation";

const schema = z.object({ email: emailField });
type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      setDone(true);
      cooldown.start(60);
    },
    onError: (e) => {
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      setServerError(describeError(e));
    },
  });

  const onSubmit = handleSubmit((v) => {
    setServerError(null);
    mutation.mutate(v.email);
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Reset your password</h1>
      {done ? (
        <FormAlert tone="success">
          If an account exists for that email, a reset link is on its way. It works once and expires soon.
        </FormAlert>
      ) : (
        <p className="text-sm text-muted">Enter your college email and we’ll send you a reset link.</p>
      )}
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="College email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" disabled={mutation.isPending || cooldown.remaining > 0}>
          {mutation.isPending
            ? "Sending…"
            : cooldown.remaining > 0
              ? `Send again in ${cooldown.remaining}s`
              : done
                ? "Send again"
                : "Send reset link"}
        </Button>
      </form>
      <Link to="/login" className="text-sm underline">
        Back to log in
      </Link>
    </div>
  );
}
