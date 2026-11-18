import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/endpoints/auth";
import { ApiError } from "../../api/errors";
import { renderPage, stubGuestSession } from "../../test/utils";
import { CheckEmailPage } from "./CheckEmailPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { VerifyEmailPage } from "./VerifyEmailPage";

vi.mock("../../api/endpoints/auth");
const mocked = vi.mocked(authApi);

/** True if the mock's first call started with exactly these arguments (the query library may add more). */
function firstCallArgs(fn: { mock: { calls: unknown[][] } }, count: number) {
  return fn.mock.calls[0]?.slice(0, count);
}

const ok = { message: "ok" };
const authOk = { accessToken: "a", tokenType: "Bearer", expiresIn: 900 };
const err = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  new ApiError({ status, code, ...extra });

beforeEach(() => stubGuestSession());
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  const extra = [{ path: "/", element: <p>home</p> }, { path: "/check-email", element: <p>check</p> }];

  it("logs in with cookie delivery and goes home", async () => {
    mocked.login.mockResolvedValue(authOk);
    renderPage(<LoginPage />, { route: "/login", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("College email"), "a@college.edu");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/"));
    expect(firstCallArgs(mocked.login, 1)).toEqual([{ email: "a@college.edu", password: "secret-password" }]);
  });

  it("shows one generic message for a wrong password", async () => {
    mocked.login.mockRejectedValue(err(401, "UNAUTHORIZED"));
    renderPage(<LoginPage />, { route: "/login", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("College email"), "a@college.edu");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("sends an unverified account to the check-email screen", async () => {
    mocked.login.mockRejectedValue(err(403, "EMAIL_NOT_VERIFIED"));
    renderPage(<LoginPage />, { route: "/login", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("College email"), "a@college.edu");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/check-email"));
  });

  it("shows the wait time and disables the button when rate limited", async () => {
    mocked.login.mockRejectedValue(err(429, "RATE_LIMITED", { retryAfter: 30 }));
    renderPage(<LoginPage />, { route: "/login", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("College email"), "a@college.edu");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("30 seconds");
    expect(screen.getByRole("button", { name: /Wait 30s/ })).toBeDisabled();
  });

  it("validates before calling the API", async () => {
    renderPage(<LoginPage />, { route: "/login", extra });
    await userEvent.setup().click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(mocked.login).not.toHaveBeenCalled();
  });
});

describe("RegisterPage", () => {
  const extra = [{ path: "/check-email", element: <p>check</p> }];

  async function fill(user: ReturnType<typeof userEvent.setup>, over: Partial<Record<string, string>> = {}) {
    await user.type(screen.getByLabelText("College email"), over.email ?? "a@college.edu");
    await user.type(screen.getByLabelText("Username"), over.username ?? "Thoibi_D");
    await user.type(screen.getByLabelText("Name"), over.name ?? "Thoibi D");
    await user.type(screen.getByLabelText("Password"), over.password ?? "long-enough-pass");
  }

  it("lowercases the username and sends the user to check-email", async () => {
    mocked.register.mockResolvedValue(ok);
    renderPage(<RegisterPage />, { route: "/register", extra });
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/check-email"));
    expect(firstCallArgs(mocked.register, 1)).toEqual([
      { email: "a@college.edu", username: "thoibi_d", displayName: "Thoibi D", password: "long-enough-pass" },
    ]);
  });

  it("rejects a short password and a bad username without calling the API", async () => {
    renderPage(<RegisterPage />, { route: "/register", extra });
    const user = userEvent.setup();
    await fill(user, { username: "bad__name", password: "short" });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/at least 10 characters/i, { selector: "p[id$=error]" })).toBeInTheDocument();
    expect(screen.getByText(/single underscores/)).toBeInTheDocument();
    expect(mocked.register).not.toHaveBeenCalled();
  });

  it("places server field errors on the matching input", async () => {
    mocked.register.mockRejectedValue(
      err(400, "VALIDATION_FAILED", { fieldErrors: [{ field: "email", message: "Use your college email" }] }),
    );
    renderPage(<RegisterPage />, { route: "/register", extra });
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use your college email")).toBeInTheDocument();
    expect(screen.getByLabelText("College email")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the server's text for a failure with no field list", async () => {
    mocked.register.mockRejectedValue(err(400, "VALIDATION_FAILED", { detail: "That password is too common." }));
    renderPage(<RegisterPage />, { route: "/register", extra });
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That password is too common.");
  });
});

describe("CheckEmailPage", () => {
  it("shows the address and starts the resend cooldown right after registering", () => {
    renderPage(<CheckEmailPage />, { route: "/check-email", state: { email: "a@college.edu", justSent: true } });
    expect(screen.getByText("a@college.edu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send again in 60s/ })).toBeDisabled();
  });

  it("resends and shows the same neutral message", async () => {
    mocked.resendVerification.mockResolvedValue(ok);
    renderPage(<CheckEmailPage />, { route: "/check-email", state: { email: "a@college.edu" } });
    await userEvent.setup().click(screen.getByRole("button", { name: "Send the link again" }));
    expect(await screen.findByRole("status")).toHaveTextContent("a new link is on its way");
    expect(firstCallArgs(mocked.resendVerification, 1)).toEqual(["a@college.edu"]);
  });
});

describe("VerifyEmailPage", () => {
  it("posts the token once and shows success", async () => {
    mocked.verifyEmail.mockResolvedValue(ok);
    renderPage(<VerifyEmailPage />, { route: "/verify-email?token=abc" });
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(mocked.verifyEmail).toHaveBeenCalledTimes(1);
    expect(firstCallArgs(mocked.verifyEmail, 1)).toEqual(["abc"]);
  });

  it("explains an invalid or expired link", async () => {
    mocked.verifyEmail.mockRejectedValue(err(400, "INVALID_TOKEN"));
    renderPage(<VerifyEmailPage />, { route: "/verify-email?token=abc" });
    expect(await screen.findByText("This link has expired")).toBeInTheDocument();
  });

  it("handles a link with no token without calling the API", () => {
    renderPage(<VerifyEmailPage />, { route: "/verify-email" });
    expect(screen.getByText("This link is incomplete")).toBeInTheDocument();
    expect(mocked.verifyEmail).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordPage", () => {
  it("always shows the same confirmation", async () => {
    mocked.forgotPassword.mockResolvedValue(ok);
    renderPage(<ForgotPasswordPage />, { route: "/forgot-password" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("College email"), "a@college.edu");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("If an account exists");
  });
});

describe("ResetPasswordPage", () => {
  const extra = [{ path: "/login", element: <p>login</p> }];

  it("rejects mismatched passwords", async () => {
    renderPage(<ResetPasswordPage />, { route: "/reset-password?token=t", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New password"), "long-enough-pass");
    await user.type(screen.getByLabelText("Repeat the password"), "different-pass-1");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The passwords don’t match")).toBeInTheDocument();
    expect(mocked.resetPassword).not.toHaveBeenCalled();
  });

  it("sends the token and new password, then goes to log in", async () => {
    mocked.resetPassword.mockResolvedValue(ok);
    renderPage(<ResetPasswordPage />, { route: "/reset-password?token=t", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New password"), "long-enough-pass");
    await user.type(screen.getByLabelText("Repeat the password"), "long-enough-pass");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/login"));
    expect(firstCallArgs(mocked.resetPassword, 1)).toEqual([{ token: "t", password: "long-enough-pass" }]);
  });

  it("keeps the form when the server calls the password too weak", async () => {
    mocked.resetPassword.mockRejectedValue(err(400, "VALIDATION_FAILED", { detail: "That password is too common." }));
    renderPage(<ResetPasswordPage />, { route: "/reset-password?token=t", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New password"), "password1234");
    await user.type(screen.getByLabelText("Repeat the password"), "password1234");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("too common");
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("offers a new link when the token is invalid", async () => {
    mocked.resetPassword.mockRejectedValue(err(400, "INVALID_TOKEN"));
    renderPage(<ResetPasswordPage />, { route: "/reset-password?token=t", extra });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New password"), "long-enough-pass");
    await user.type(screen.getByLabelText("Repeat the password"), "long-enough-pass");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("This link has expired")).toBeInTheDocument();
  });
});
