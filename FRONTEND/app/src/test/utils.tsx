import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import { SessionProvider } from "../session/SessionProvider";

/** Pretend nobody is signed in: the boot-time refresh gets the API's standard 401. */
export function stubGuestSession() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ status: 401, code: "UNAUTHORIZED" }), { status: 401 })),
  );
}

/** Shows the current path so tests can assert where the app navigated. */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="path">{loc.pathname}</div>;
}

interface Options {
  route: string;
  /** Extra routes, so navigation targets can be asserted. */
  extra?: { path: string; element: ReactNode }[];
  path?: string;
  state?: unknown;
}

export function renderPage(page: ReactNode, { route, path, extra = [], state }: Options) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const entry = state === undefined ? route : { pathname: route.split("?")[0]!, search: route.includes("?") ? `?${route.split("?")[1]}` : "", state };
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path={path ?? route.split("?")[0]!} element={page} />
            {extra.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}
