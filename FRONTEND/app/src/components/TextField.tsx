import { useId, type ComponentProps } from "react";

interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function TextField({ label, error, hint, id, className = "", ...rest }: TextFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1 min-h-11 w-full rounded-lg border bg-card px-3 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent ${
          error ? "border-danger" : "border-line"
        } ${className}`}
        {...rest}
      />
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
