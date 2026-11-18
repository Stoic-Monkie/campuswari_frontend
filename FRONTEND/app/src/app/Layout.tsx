import { Home, PlusSquare, User } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { Wordmark } from "../components/Wordmark";

const nav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/new", label: "New post", icon: PlusSquare, end: false },
  { to: "/settings", label: "Profile", icon: User, end: false },
];

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2 backdrop-blur">
        <NavLink to="/" aria-label="CampusWari home">
          <Wordmark className="text-2xl" />
        </NavLink>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex max-w-xl justify-around">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  `flex h-14 w-16 items-center justify-center ${isActive ? "text-accent" : "text-muted"}`
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
