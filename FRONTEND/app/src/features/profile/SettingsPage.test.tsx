import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/endpoints/auth";
import * as blocksApi from "../../api/endpoints/blocks";
import * as usersApi from "../../api/endpoints/users";
import { ApiError } from "../../api/errors";
import { makeMe } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../api/endpoints/users");
vi.mock("../../api/endpoints/auth");
vi.mock("../../api/endpoints/blocks");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const users = vi.mocked(usersApi);
const auth = vi.mocked(authApi);
const blocks = vi.mocked(blocksApi);

const extra = [{ path: "/login", element: <p>login page</p> }];
const open = () => renderPage(<SettingsPage />, { route: "/settings", extra });
const body = () => users.updateMe.mock.calls[0]?.[0];

beforeEach(() => {
  stubGuestSession();
  localStorage.clear();
  meRef.current = makeMe({ displayName: "Me Myself", bio: "Old bio" });
  blocks.listBlocks.mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("SettingsPage profile", () => {
  it("fills the form and keeps Save disabled until something changes", async () => {
    open();
    expect(await screen.findByLabelText("Name")).toHaveValue("Me Myself");
    expect(screen.getByLabelText("Bio")).toHaveValue("Old bio");
    expect(screen.getByText(/me@college.edu/)).toBeInTheDocument();
    expect(screen.getByText(/@me/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("sends only the field that changed", async () => {
    users.updateMe.mockResolvedValue(makeMe({ bio: "New bio" }));
    open();
    const user = userEvent.setup();
    const bio = await screen.findByLabelText("Bio");
    await user.clear(bio);
    await user.type(bio, "New bio");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(body()).toEqual({ bio: "New bio" });
  });

  it("clears the bio by sending an empty string", async () => {
    users.updateMe.mockResolvedValue(makeMe({ bio: null }));
    open();
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText("Bio"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(users.updateMe).toHaveBeenCalled());
    expect(body()).toEqual({ bio: "" });
  });

  it("refuses an empty name and an over-long bio without calling the API", async () => {
    open();
    const user = userEvent.setup();
    const name = await screen.findByLabelText("Name");
    await user.clear(name);
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "x".repeat(301) } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("At most 300 characters")).toBeInTheDocument();
    expect(users.updateMe).not.toHaveBeenCalled();
  });

  it("shows a server field error on the right input", async () => {
    users.updateMe.mockRejectedValue(
      new ApiError({ status: 400, code: "VALIDATION_FAILED", fieldErrors: [{ field: "displayName", message: "Name not allowed" }] }),
    );
    open();
    const user = userEvent.setup();
    const name = await screen.findByLabelText("Name");
    await user.type(name, "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Name not allowed")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
  });
});

describe("SettingsPage appearance and sessions", () => {
  it("switches the theme and remembers it", async () => {
    open();
    await userEvent.setup().click(await screen.findByRole("radio", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("cw-theme")).toBe("dark");
    await userEvent.setup().click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("logs out everywhere only after confirming, then returns to the login screen", async () => {
    auth.logoutAll.mockResolvedValue(undefined);
    auth.logout.mockResolvedValue(undefined);
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Log out everywhere" }));
    expect(auth.logoutAll).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log out everywhere" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/login"));
    expect(auth.logoutAll).toHaveBeenCalledTimes(1);
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the confirmation is cancelled", async () => {
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Log out everywhere" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(auth.logoutAll).not.toHaveBeenCalled();
  });

  it("stays signed in and shows the problem if the server call fails", async () => {
    auth.logoutAll.mockRejectedValue(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Log out everywhere" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log out everywhere" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("logs out normally", async () => {
    auth.logout.mockResolvedValue(undefined);
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/login"));
    expect(auth.logoutAll).not.toHaveBeenCalled();
  });
});
