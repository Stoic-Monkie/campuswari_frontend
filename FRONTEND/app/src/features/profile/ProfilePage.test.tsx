import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as usersApi from "../../api/endpoints/users";
import { ApiError } from "../../api/errors";
import type { UserProfile } from "../../api/schemas";
import { makeMe, makePost } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { ProfilePage } from "./ProfilePage";

vi.mock("../../api/endpoints/users");
vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/likes");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const users = vi.mocked(usersApi);

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: "u-other",
  username: "other",
  displayName: "Other Person",
  bio: "Physics, chai and long walks.",
  avatarUrl: null,
  createdAt: "2026-03-05T00:00:00Z",
  ...over,
});

const open = (username = "other") =>
  renderPage(<ProfilePage />, { route: `/u/${username}`, path: "/u/:username" });

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe();
  users.getProfile.mockResolvedValue(profile());
  users.listUserPosts.mockResolvedValue({ items: [makePost({ id: "p1", content: "Their post" })], nextCursor: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ProfilePage", () => {
  it("shows the person and their posts", async () => {
    open();
    expect(await screen.findByRole("heading", { name: "Other Person" })).toBeInTheDocument();
    expect(screen.getByText("@other")).toBeInTheDocument();
    expect(screen.getByText("Physics, chai and long walks.")).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
    expect(await screen.findByText("Their post")).toBeInTheDocument();
    expect(users.getProfile.mock.calls[0]?.[0]).toBe("other");
    expect(users.listUserPosts.mock.calls[0]?.[0]).toBe("other");
  });

  it("offers Edit only on your own profile", async () => {
    users.getProfile.mockResolvedValue(profile({ id: "u-me", username: "me", displayName: "Me Myself" }));
    open("me");
    expect(await screen.findByRole("link", { name: "Edit profile and settings" })).toHaveAttribute("href", "/settings");
  });

  it("does not offer Edit on someone else's profile", async () => {
    open();
    await screen.findByRole("heading", { name: "Other Person" });
    expect(screen.queryByRole("link", { name: "Edit profile and settings" })).toBeNull();
  });

  it("says the profile isn't available on 404 and does not load posts", async () => {
    users.getProfile.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    open("ghost");
    expect(await screen.findByText("This profile isn’t available")).toBeInTheDocument();
    expect(users.listUserPosts).not.toHaveBeenCalled();
  });

  it("pages through posts with the cursor", async () => {
    users.listUserPosts
      .mockResolvedValueOnce({ items: [makePost({ id: "p1", content: "First" })], nextCursor: "C1" })
      .mockResolvedValueOnce({ items: [makePost({ id: "p2", content: "Second" })], nextCursor: null });
    open();
    await screen.findByText("First");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Second")).toBeInTheDocument();
    expect(users.listUserPosts.mock.calls[1]?.[1]).toEqual({ cursor: "C1" });
  });

  it("has different empty messages for you and for others", async () => {
    users.listUserPosts.mockResolvedValue({ items: [], nextCursor: null });
    const { unmount } = open();
    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    unmount();
    users.getProfile.mockResolvedValue(profile({ id: "u-me", username: "me" }));
    open("me");
    expect(await screen.findByText("You haven’t posted yet")).toBeInTheDocument();
  });
});
