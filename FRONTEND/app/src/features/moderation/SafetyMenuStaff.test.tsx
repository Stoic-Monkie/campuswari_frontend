import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminApi from "../../api/endpoints/admin";
import { ApiError } from "../../api/errors";
import { makeMe } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { SafetyMenu } from "./SafetyMenu";

vi.mock("../../api/endpoints/admin");
vi.mock("../../api/endpoints/blocks");
vi.mock("../../api/endpoints/reports");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const admin = vi.mocked(adminApi);

const other = { id: "u-other", username: "other" };
const open = (type: "POST" | "COMMENT" | "USER", onRemoved = vi.fn()) => {
  renderPage(<SafetyMenu author={other} targetType={type} targetId="t1" onRemoved={onRemoved} />, { route: "/" });
  return onRemoved;
};
const menu = async () => userEvent.setup().click(await screen.findByRole("button", { name: "More options" }));
const labels = () => screen.getAllByRole("menuitem").map((i) => i.textContent);

beforeEach(() => {
  stubGuestSession();
  admin.hidePost.mockResolvedValue(undefined);
  admin.hideComment.mockResolvedValue(undefined);
  admin.suspendUser.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("staff items in the menu", () => {
  it("gives students only report and block", async () => {
    meRef.current = makeMe({ role: "STUDENT" });
    open("POST");
    await menu();
    expect(labels()).toEqual(["Report post", "Block @other"]);
  });

  it("gives moderators a Hide item on posts and comments", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    open("POST");
    await menu();
    expect(labels()).toContain("Hide post (staff)");
  });

  it("hides a post after confirming and reports back", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    const onRemoved = open("POST");
    const user = userEvent.setup();
    await menu();
    await user.click(screen.getByRole("menuitem", { name: "Hide post (staff)" }));
    const dialog = screen.getByRole("dialog", { name: "Hide this post?" });
    expect(admin.hidePost).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Hide" }));
    await vi.waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(admin.hidePost.mock.calls[0]?.[0]).toBe("t1");
  });

  it("hides a comment with the comment endpoint", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    open("COMMENT");
    const user = userEvent.setup();
    await menu();
    await user.click(screen.getByRole("menuitem", { name: "Hide comment (staff)" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hide" }));
    await vi.waitFor(() => expect(admin.hideComment).toHaveBeenCalled());
    expect(admin.hideComment.mock.calls[0]?.[0]).toBe("t1");
    expect(admin.hidePost).not.toHaveBeenCalled();
  });

  it("explains a hide that failed because the item is gone", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    admin.hidePost.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    const onRemoved = open("POST");
    const user = userEvent.setup();
    await menu();
    await user.click(screen.getByRole("menuitem", { name: "Hide post (staff)" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hide" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("no longer exists");
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it("gives moderators no suspend item on a person", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    open("USER");
    await menu();
    expect(labels()).toEqual(["Report this person", "Block @other"]);
  });

  it("gives admins a Suspend item on a person, with a confirmation", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    const onRemoved = open("USER");
    const user = userEvent.setup();
    await menu();
    await user.click(screen.getByRole("menuitem", { name: "Suspend @other (admin)" }));
    const dialog = screen.getByRole("dialog", { name: "Suspend @other?" });
    expect(dialog).toHaveTextContent(/audit log/);
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));
    await vi.waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(admin.suspendUser.mock.calls[0]?.[0]).toBe("u-other");
  });

  it("does not give admins a suspend item on posts", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    open("POST");
    await menu();
    expect(labels().some((l) => l?.includes("Suspend"))).toBe(false);
  });
});
