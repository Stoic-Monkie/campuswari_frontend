import { Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { Wordmark } from "../components/Wordmark";

/** Frame for signed-out screens: wordmark, one centred card, no navigation. */
export function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <div className="flex justify-end pt-2">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center pb-16">
        <header className="mb-6 text-center">
          <Wordmark className="text-5xl" />
          <p className="mt-2 text-sm text-muted">Stories from your campus, for your campus.</p>
        </header>
        <main className="rounded-card border border-line bg-card p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
