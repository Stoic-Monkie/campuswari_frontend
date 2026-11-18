import type { ReactNode } from "react";

type Tone = "error" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-danger/40 bg-danger/10 text-danger",
  info: "border-line bg-card text-fg",
  success: "border-line bg-card text-fg",
};

/** Message box for form-level results. Errors are announced to screen readers. */
export function FormAlert({ tone = "error", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
