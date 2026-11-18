import { api } from "../client";
import { authResponseSchema, messageResponseSchema } from "../schemas";

/** The web app always uses cookie delivery: the refresh token stays in an httpOnly cookie. */
export function login(body: { email: string; password: string }) {
  return api.request("/auth/login", {
    method: "POST",
    auth: false,
    body: { ...body, delivery: "COOKIE" },
    schema: authResponseSchema,
  });
}

export function register(body: {
  email: string;
  username: string;
  displayName: string;
  password: string;
}) {
  return api.request("/auth/register", {
    method: "POST",
    auth: false,
    body,
    schema: messageResponseSchema,
  });
}

export function verifyEmail(token: string) {
  return api.request("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: { token },
    schema: messageResponseSchema,
  });
}

export function resendVerification(email: string) {
  return api.request("/auth/resend-verification", {
    method: "POST",
    auth: false,
    body: { email },
    schema: messageResponseSchema,
  });
}

export function forgotPassword(email: string) {
  return api.request("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
    schema: messageResponseSchema,
  });
}

export function resetPassword(body: { token: string; password: string }) {
  return api.request("/auth/reset-password", {
    method: "POST",
    auth: false,
    body,
    schema: messageResponseSchema,
  });
}

/** Always succeeds on the server (204). The cookie is cleared by the response. */
export function logout() {
  return api.request("/auth/logout", { method: "POST", auth: false });
}

/** Ends every session of this account on the server (needs the bearer token). */
export function logoutAll() {
  return api.request("/auth/logout-all", { method: "POST" });
}
