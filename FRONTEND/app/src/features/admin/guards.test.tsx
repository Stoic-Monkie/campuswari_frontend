import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffOnly } from "../../app/guards";
import { makeMe } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";

const meRef = vi.hoisted(() => ({ current: undefined as unknown, pending: false }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current, isPending: meRef.pending }) }));

const open = () =>
  renderPage(
    <StaffOnly>
      <p>moderation tools</p>
    </StaffOnly>,
    { route: "/admin" },
  );

beforeEach(() => {
  stubGuestSession();
  meRef.pending = false;
});
afterEach(() => vi.unstubAllGlobals());

describe("StaffOnly", () => {
  it("shows the screen to moderators and admins", () => {
    for (const role of ["MODERATOR", "ADMIN"] as const) {
      meRef.current = makeMe({ role });
      const { unmount } = open();
      expect(screen.getByText("moderation tools")).toBeInTheDocument();
      unmount();
    }
  });

  it("shows students the ordinary not-found page, so the screen is not advertised", () => {
    meRef.current = makeMe({ role: "STUDENT" });
    open();
    expect(screen.queryByText("moderation tools")).toBeNull();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("waits while the profile loads instead of flashing not-found", () => {
    meRef.current = undefined;
    meRef.pending = true;
    open();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("Nothing here")).toBeNull();
  });
});
