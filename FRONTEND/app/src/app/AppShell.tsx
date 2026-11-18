import { useQueryClient } from "@tanstack/react-query";
import { Home, LogOut, PlusSquare, ShieldCheck, User } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/endpoints/auth";
import { ThemeToggle } from "../components/ThemeToggle";
import { Wordmark } from "../components/Wordmark";
import { isStaff } from "../features/me/roles";
import { useMe } from "../features/me/useMe";
import { useSession } from "../session/SessionProvider";

function navItems(username: string | undefined, staff: boolean) {
  return [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/new", label: "New post", icon: PlusSquare, end: false },
    // Your own profile; until we know the username, settings is the closest page.
    { to: username ? `/u/${username}` : "/settings", label: "Profile", icon: User, end: false },
    ...(staff ? [{ to: "/admin", label: "Moderation", icon: ShieldCheck, end: false }] : []),
  ];
}

/** Frame for signed-in screens: header, content column, bottom nav (phones) or side rail (desktop). */
export function AppShell() {
  const { signOut } = useSession();
  const me = useMe().data;
  const nav = navItems(me?.username, isStaff(me));
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await logout();
    } catch {
      /* the server always accepts logout; even if the call fails, end the session here */
    }
    signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
          <NavLink to="/" aria-label="CampusWari home">
            <Wordmark className="text-2xl" />
          </NavLink>
          <div className="flex items-center">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Log out"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-4 pb-24 md:pb-8">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur md:inset-y-0 md:right-auto md:w-20 md:border-r md:border-t-0 md:pt-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex max-w-xl justify-around md:flex-col md:items-center md:justify-start md:gap-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  `flex h-14 w-16 items-center justify-center ${isActive ? "text-accent" : "text-muted hover:text-fg"}`
                }
              >
                <Icon size={24} aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
