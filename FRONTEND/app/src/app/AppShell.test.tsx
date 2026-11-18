import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeMe } from "../test/factories";
import { renderPage, stubGuestSession } from "../test/utils";
import { AppShell } from "./AppShell";

const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../features/me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));

beforeEach(() => stubGuestSession());
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppShell navigation", () => {
  it("points Profile at your own profile once your username is known", () => {
    meRef.current = makeMe({ username: "thoibi" });
    renderPage(<AppShell />, { route: "/" });
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/u/thoibi");
  });

  it("falls back to settings while the profile is still loading", () => {
    meRef.current = undefined;
    renderPage(<AppShell />, { route: "/" });
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/settings");
  });

  it("shows the Moderation link to staff only", () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    const { unmount } = renderPage(<AppShell />, { route: "/" });
    expect(screen.getByRole("link", { name: "Moderation" })).toHaveAttribute("href", "/admin");
    unmount();
    meRef.current = makeMe({ role: "STUDENT" });
    renderPage(<AppShell />, { route: "/" });
    expect(screen.queryByRole("link", { name: "Moderation" })).toBeNull();
  });
});
