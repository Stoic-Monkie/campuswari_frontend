import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Splash } from "../components/Splash";
import { isStaff } from "../features/me/roles";
import { useMe } from "../features/me/useMe";
import { NotFound } from "../pages/NotFound";
import { useSession } from "../session/SessionProvider";

/** Signed-out screens (login, register ...). Signed-in users are sent home. */
export function GuestOnly() {
  const { status } = useSession();
  if (status === "booting") return <Splash />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Screens that need a session. Remembers where the user was heading. */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "booting") return <Splash />;
  if (status === "guest") return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/**
 * Moderation screens. Students see the same "nothing here" page as for any unknown address,
 * so the screen is not advertised. The server checks the role on every staff call anyway.
 */
export function StaffOnly({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isPending) {
    return (
      <p role="status" className="py-8 text-center text-sm text-muted">
        Loading…
      </p>
    );
  }
  if (!isStaff(me.data)) return <NotFound />;
  return <>{children}</>;
}
