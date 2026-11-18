import type { z } from "zod";
import { ApiError, errorFromResponse } from "./errors";
import { authResponseSchema, type AuthResponse } from "./schemas";

export interface ApiClientOptions {
  /** Base path of the API, default "/api". */
  baseUrl?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<S extends z.ZodType | undefined = undefined> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Parse and validate the JSON response with this schema. */
  schema?: S;
  /** Send the bearer token and handle 401 with a refresh (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

type Result<S> = S extends z.ZodType ? z.infer<S> : undefined;

const REFRESH_PATH = "/auth/refresh";

/**
 * HTTP client for the CampusWari API.
 *
 *  - The access token lives in memory only.
 *  - Refresh is SINGLE-FLIGHT: refresh tokens rotate and are single use, so two
 *    refreshes at once would look like token reuse and revoke the whole session.
 *  - On 401 the request waits for the shared refresh, then retries once.
 *  - Failures become ApiError (problem+json parsed, Retry-After read).
 */
export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? "/api";
  const doFetch: typeof fetch = options.fetchImpl ?? ((...args) => fetch(...args));

  let accessToken: string | null = null;
  let refreshInFlight: Promise<string | null> | null = null;
  const signedOutListeners = new Set<() => void>();

  function notifySignedOut() {
    signedOutListeners.forEach((fn) => fn());
  }

  function setAccessToken(token: string | null) {
    accessToken = token;
  }

  function getAccessToken() {
    return accessToken;
  }

  /** Subscribe to "the session is gone" events. Returns an unsubscribe function. */
  function onSignedOut(fn: () => void): () => void {
    signedOutListeners.add(fn);
    return () => signedOutListeners.delete(fn);
  }

  async function performRefresh(): Promise<string | null> {
    let res: Response;
    try {
      res = await doFetch(baseUrl + REFRESH_PATH, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // Network problem: we do not know the session is dead, so do not sign out.
      throw new ApiError({ status: 0, message: "Network error" });
    }

    if (res.ok) {
      const parsed = authResponseSchema.parse(await res.json());
      accessToken = parsed.accessToken;
      return parsed.accessToken;
    }

    if (res.status === 401 || res.status === 400) {
      // The server uses one identical 401 for every refresh failure.
      accessToken = null;
      notifySignedOut();
      return null;
    }

    throw await errorFromResponse(res);
  }

  /** Shared refresh: concurrent callers get the same promise. */
  function refresh(): Promise<string | null> {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  /** Try to restore a session from the refresh cookie (page load). */
  async function restoreSession(): Promise<boolean> {
    const token = await refresh();
    return token !== null;
  }

  async function send(path: string, opts: RequestOptions<z.ZodType | undefined>, token: string | null) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
    try {
      return await doFetch(baseUrl + path, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        credentials: "include",
        signal: opts.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError({ status: 0, message: "Network error" });
    }
  }

  async function request<S extends z.ZodType | undefined = undefined>(
    path: string,
    opts: RequestOptions<S> = {},
  ): Promise<Result<S>> {
    const needsAuth = opts.auth !== false;
    let token = accessToken;

    if (needsAuth && !token) {
      token = await refresh();
      if (!token) throw new ApiError({ status: 401, message: "Not signed in" });
    }

    let res = await send(path, opts, token);

    if (res.status === 401 && needsAuth) {
      let next: string | null;
      if (accessToken && accessToken !== token) {
        // Someone already refreshed while we were waiting: just use the new token.
        next = accessToken;
      } else {
        next = await refresh();
      }
      if (!next) throw await errorFromResponse(res);
      res = await send(path, opts, next);
    }

    if (!res.ok) throw await errorFromResponse(res);
    if (res.status === 204 || !opts.schema) {
      return undefined as Result<S>;
    }
    const json: unknown = await res.json();
    return opts.schema.parse(json) as Result<S>;
  }

  /** Store the tokens from a login/refresh response. */
  function acceptAuth(auth: AuthResponse) {
    accessToken = auth.accessToken;
  }

  return { request, refresh, restoreSession, setAccessToken, getAccessToken, onSignedOut, acceptAuth };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The app-wide client. */
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE ?? "/api",
});
