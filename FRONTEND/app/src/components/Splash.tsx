import { Wordmark } from "./Wordmark";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Wordmark className="text-4xl opacity-70" />
    </div>
  );
}
