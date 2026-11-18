import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "./client";
import { ApiError } from "./errors";

const auth = (token: string) =>
  new Response(JSON.stringify({ accessToken: token, tokenType: "Bearer", expiresIn: 900 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const problem = (status: number, body: Record<string, unknown> = {}, headers = {}) =>
  new Response(JSON.stringify({ status, title: "x", ...body }), {
    status,
    headers: { "Content-Type": "application/problem+json", ...headers },
  });

function setup(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) =>
    handler(String(input), init),
  );
  const client = createApiClient({ baseUrl: "/api", fetchImpl: fetchImpl as unknown as typeof fetch });
  return { client, fetchImpl };
}

const refreshCalls = (f: ReturnType<typeof setup>["fetchImpl"]) =>
  f.mock.calls.filter(([u]) => String(u).endsWith("/auth/refresh")).length;

describe("api client", () => {
  it("sends the bearer token and parses the response with the schema", async () => {
    const { client, fetchImpl } = setup(() => json({ ok: true }));
    client.setAccessToken("t1");
    const out = await client.request("/ping", { schema: z.object({ ok: z.boolean() }) });
    expect(out).toEqual({ ok: true });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t1");
  });

  it("refreshes exactly once when several requests get 401 at the same time", async () => {
    // The server only accepts "new"; the client starts with an expired "old" token.
    const { client, fetchImpl } = setup(async (url, init) => {
      if (url.endsWith("/auth/refresh")) {
        await new Promise((r) => setTimeout(r, 20));
        return auth("new");
      }
      const header = (init.headers as Record<string, string>).Authorization;
      return header === "Bearer new" ? json({ ok: true }) : problem(401);
    });
    client.setAccessToken("old");
    const schema = z.object({ ok: z.boolean() });
    const results = await Promise.all([
      client.request("/a", { schema }),
      client.request("/b", { schema }),
      client.request("/c", { schema }),
    ]);
    expect(results).toHaveLength(3);
    expect(refreshCalls(fetchImpl)).toBe(1);
    expect(client.getAccessToken()).toBe("new");
  });

  it("does not refresh again if another request already replaced the token", async () => {
    const { client, fetchImpl } = setup(async (url, init) => {
      if (url.endsWith("/auth/refresh")) return auth("new");
      const header = (init.headers as Record<string, string>).Authorization;
      if (url.endsWith("/slow")) {
        await new Promise((r) => setTimeout(r, 30));
      }
      return header === "Bearer new" ? json({ ok: true }) : problem(401);
    });
    client.setAccessToken("old");
    const schema = z.object({ ok: z.boolean() });
    const slow = client.request("/slow", { schema });
    await client.request("/fast", { schema });
    await slow;
    expect(refreshCalls(fetchImpl)).toBe(1);
  });

  it("signs out when the refresh fails with 401", async () => {
    const { client } = setup((url) => (url.endsWith("/auth/refresh") ? problem(401) : problem(401)));
    const signedOut = vi.fn();
    client.onSignedOut(signedOut);
    client.setAccessToken("old");
    await expect(client.request("/me")).rejects.toMatchObject({ status: 401 });
    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBeNull();
  });

  it("does not sign out on a network error during refresh", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/auth/refresh")) throw new TypeError("offline");
      return problem(401);
    });
    const client = createApiClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const signedOut = vi.fn();
    client.onSignedOut(signedOut);
    client.setAccessToken("old");
    await expect(client.request("/me")).rejects.toMatchObject({ status: 0 });
    expect(signedOut).not.toHaveBeenCalled();
  });

  it("restores a session from the cookie on boot", async () => {
    const { client, fetchImpl } = setup(() => auth("fresh"));
    expect(await client.restoreSession()).toBe(true);
    expect(client.getAccessToken()).toBe("fresh");
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("restoreSession returns false for a guest", async () => {
    const { client } = setup(() => problem(401));
    expect(await client.restoreSession()).toBe(false);
  });

  it("parses problem+json: code, field errors, error id and Retry-After", async () => {
    const { client } = setup(() =>
      problem(
        429,
        { code: "RATE_LIMITED", detail: "Slow down", errorId: "e1", errors: [{ field: "x", message: "bad" }] },
        { "Retry-After": "42" },
      ),
    );
    client.setAccessToken("t");
    const err = (await client.request("/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfter).toBe(42);
    expect(err.errorId).toBe("e1");
    expect(err.fieldErrors).toEqual([{ field: "x", message: "bad" }]);
  });

  it("returns undefined for 204", async () => {
    const { client } = setup(() => new Response(null, { status: 204 }));
    client.setAccessToken("t");
    expect(await client.request("/x", { method: "DELETE" })).toBeUndefined();
  });

  it("public calls do not send a token and do not refresh on 401", async () => {
    const { client, fetchImpl } = setup(() => problem(401, { detail: "bad login" }));
    client.setAccessToken("t");
    await expect(client.request("/auth/login", { method: "POST", body: {}, auth: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(refreshCalls(fetchImpl)).toBe(0);
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
