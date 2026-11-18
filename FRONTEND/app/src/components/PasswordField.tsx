import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

interface PasswordFieldProps extends Omit<ComponentProps<"input">, "type"> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function PasswordField({ label, error, hint, id, className = "", ...rest }: PasswordFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const [shown, setShown] = useState(false);
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          type={shown ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`min-h-11 w-full rounded-lg border bg-card py-0 pl-3 pr-12 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent ${
            error ? "border-danger" : "border-line"
          } ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-fg"
        >
          {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
