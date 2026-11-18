import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminApi from "../../api/endpoints/admin";
import { ApiError } from "../../api/errors";
import { makeMe, makeReport } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { AdminPage } from "./AdminPage";

vi.mock("../../api/endpoints/admin");
vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/comments");
vi.mock("../../api/endpoints/likes");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const admin = vi.mocked(adminApi);

const open = (route = "/admin") => renderPage(<AdminPage />, { route, path: "/admin" });
const page = (...items: ReturnType<typeof makeReport>[]) => ({ items, nextCursor: null });
const first = (fn: { mock: { calls: unknown[][] } }, i = 0) => fn.mock.calls[i]?.[0];

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe({ role: "MODERATOR" });
  for (const f of [admin.hidePost, admin.unhidePost, admin.hideComment, admin.unhideComment, admin.suspendUser, admin.reinstateUser, admin.resolveReport]) {
    f.mockResolvedValue(undefined);
  }
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminPage queue", () => {
  it("lists open reports with reason, preview, status and reporter", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", reason: "HARASSMENT", reporterUsername: "ann" })));
    open();
    expect(await screen.findByText("Reported text 1")).toBeInTheDocument();
    expect(screen.getByText("Harassment")).toBeInTheDocument();
    expect(screen.getByLabelText("Target status: Visible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@ann" })).toHaveAttribute("href", "/u/ann");
    expect(first(admin.listReports)).toEqual({ status: "OPEN", cursor: undefined });
  });

  it("shows reported text as plain text, never as HTML", async () => {
    const evil = '<img src=x onerror="alert(1)">';
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", targetPreview: evil })));
    const { container } = open();
    expect(await screen.findByText(evil)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("switches to the actioned queue and shows who resolved it", async () => {
    admin.listReports
      .mockResolvedValueOnce(page(makeReport({ id: "1" })))
      .mockResolvedValueOnce(page(makeReport({ id: "9", status: "ACTIONED", resolvedBy: "mod1", resolvedAt: "2026-11-10T10:00:00Z" })));
    open();
    await screen.findByText("Reported text 1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Actioned" }));
    expect(await screen.findByText(/Actioned by mod1/)).toBeInTheDocument();
    expect(first(admin.listReports, 1)).toEqual({ status: "ACTIONED", cursor: undefined });
    expect(screen.queryByRole("button", { name: "Mark actioned" })).toBeNull();
  });

  it("reads the queue from the address", async () => {
    admin.listReports.mockResolvedValue(page());
    open("/admin?status=DISMISSED");
    expect(await screen.findByText("Nothing has been dismissed yet.")).toBeInTheDocument();
    expect(first(admin.listReports)).toEqual({ status: "DISMISSED", cursor: undefined });
  });

  it("shows an all-clear message when nothing is open", async () => {
    admin.listReports.mockResolvedValue(page());
    open();
    expect(await screen.findByText("No open reports. All clear.")).toBeInTheDocument();
  });

  it("pages with the cursor", async () => {
    admin.listReports
      .mockResolvedValueOnce({ items: [makeReport({ id: "1" })], nextCursor: "C1" })
      .mockResolvedValueOnce(page(makeReport({ id: "2" })));
    open();
    await screen.findByText("Reported text 1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Reported text 2")).toBeInTheDocument();
    expect(first(admin.listReports, 1)).toEqual({ status: "OPEN", cursor: "C1" });
  });

  it("shows an error with a retry", async () => {
    admin.listReports.mockRejectedValueOnce(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    admin.listReports.mockResolvedValueOnce(page(makeReport({ id: "1" })));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Reported text 1")).toBeInTheDocument();
  });
});

describe("resolving", () => {
  it("marks a report actioned and it leaves the open queue", async () => {
    admin.listReports
      .mockResolvedValueOnce(page(makeReport({ id: "1" }), makeReport({ id: "2" })))
      .mockResolvedValue(page(makeReport({ id: "2" })));
    open();
    await screen.findByText("Reported text 1");
    const card = screen.getAllByRole("article")[0]!;
    await userEvent.setup().click(within(card).getByRole("button", { name: "Mark actioned" }));
    await waitFor(() => expect(screen.queryByText("Reported text 1")).toBeNull());
    expect(admin.resolveReport.mock.calls[0]?.slice(0, 2)).toEqual(["1", "ACTIONED"]);
    expect(screen.getByText("Reported text 2")).toBeInTheDocument();
  });

  it("dismisses a report", async () => {
    admin.listReports.mockResolvedValueOnce(page(makeReport({ id: "1" }))).mockResolvedValue(page());
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(admin.resolveReport).toHaveBeenCalled());
    expect(admin.resolveReport.mock.calls[0]?.slice(0, 2)).toEqual(["1", "DISMISSED"]);
  });

  it("says so when somebody else already resolved it", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1" })));
    admin.resolveReport.mockRejectedValue(new ApiError({ status: 409, code: "CONFLICT" }));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Mark actioned" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Somebody already resolved this report.");
  });
});

describe("acting on content", () => {
  it("hides a visible post, then offers to unhide it", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1" })));
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Hide post" }));
    expect(await screen.findByRole("button", { name: "Unhide post" })).toBeInTheDocument();
    expect(first(admin.hidePost)).toBe("t-1");
    expect(screen.getByLabelText("Target status: Hidden")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unhide post" }));
    expect(await screen.findByRole("button", { name: "Hide post" })).toBeInTheDocument();
    expect(first(admin.unhidePost)).toBe("t-1");
  });

  it("hides a comment, and has no Open post link for it", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", targetType: "COMMENT" })));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Hide comment" }));
    await waitFor(() => expect(admin.hideComment).toHaveBeenCalled());
    expect(first(admin.hideComment)).toBe("t-1");
    expect(screen.queryByRole("link", { name: "Open post" })).toBeNull();
  });

  it("links to the reported post", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1" })));
    open();
    expect(await screen.findByRole("link", { name: "Open post" })).toHaveAttribute("href", "/posts/t-1");
  });

  it("offers no hide button for a post that is already deleted", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", targetStatus: "DELETED" })));
    open();
    await screen.findByText("Reported text 1");
    expect(screen.queryByRole("button", { name: "Hide post" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Unhide post" })).toBeNull();
  });

  it("explains a failed hide", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1" })));
    admin.hidePost.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Hide post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This item no longer exists.");
  });
});

describe("accounts", () => {
  const userReport = () => makeReport({ id: "1", targetType: "USER", targetId: "u-bad", targetStatus: "ACTIVE" });

  it("tells moderators that only admins can suspend", async () => {
    admin.listReports.mockResolvedValue(page(userReport()));
    open();
    expect(await screen.findByText("Only admins can suspend accounts.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
  });

  it("lets an admin suspend after confirming, then reinstate", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    admin.listReports.mockResolvedValue(page(userReport()));
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Suspend account" }));
    expect(admin.suspendUser).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    expect(await screen.findByRole("button", { name: "Reinstate account" })).toBeInTheDocument();
    expect(first(admin.suspendUser)).toBe("u-bad");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reinstate account" }));
    expect(await screen.findByRole("button", { name: "Suspend account" })).toBeInTheDocument();
    expect(first(admin.reinstateUser)).toBe("u-bad");
  });

  it("keeps the dialog open and says why when suspending an admin is refused", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    admin.listReports.mockResolvedValue(page(userReport()));
    admin.suspendUser.mockRejectedValue(new ApiError({ status: 403, code: "FORBIDDEN" }));
    open();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Suspend account" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Admins can’t be suspended.");
  });
});
