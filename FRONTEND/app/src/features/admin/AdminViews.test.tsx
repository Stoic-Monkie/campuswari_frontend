import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminApi from "../../api/endpoints/admin";
import { ApiError } from "../../api/errors";
import { makeMe, makeReport, makeStaffComment, makeStaffPost, makeStaffUser } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { AdminPage } from "./AdminPage";

vi.mock("../../api/endpoints/admin");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const admin = vi.mocked(adminApi);

const open = (route = "/admin") => renderPage(<AdminPage />, { route, path: "/admin" });
const page = <T,>(...items: T[]) => ({ items, nextCursor: null });
const arg = (fn: { mock: { calls: unknown[][] } }, i = 0) => fn.mock.calls[i]?.[0];

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe({ role: "MODERATOR" });
  admin.listReports.mockResolvedValue(page());
  admin.listHiddenPosts.mockResolvedValue(page());
  admin.listHiddenComments.mockResolvedValue(page());
  admin.listUsers.mockResolvedValue(page());
  for (const f of [admin.unhidePost, admin.unhideComment, admin.suspendUser, admin.reinstateUser, admin.hidePost]) {
    f.mockResolvedValue(undefined);
  }
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("sections", () => {
  it("gives moderators Reports and Hidden only", async () => {
    open();
    const nav = await screen.findByRole("navigation", { name: "Moderation sections" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["Reports", "Hidden"]);
  });

  it("gives admins a People section too", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    open();
    const nav = await screen.findByRole("navigation", { name: "Moderation sections" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["Reports", "Hidden", "People"]);
  });

  it("ignores ?view=people for a moderator and shows the reports", async () => {
    open("/admin?view=people");
    await waitFor(() => expect(admin.listReports).toHaveBeenCalled());
    expect(admin.listUsers).not.toHaveBeenCalled();
  });

  it("opens the Hidden section from the address and with a click", async () => {
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Hidden" }));
    expect(await screen.findByText("No hidden posts.")).toBeInTheDocument();
    expect(arg(admin.listHiddenPosts)).toEqual({ cursor: undefined });
  });
});

describe("hidden content", () => {
  it("lists hidden posts with their author, text and counts", async () => {
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1", content: "Naughty words", likeCount: 3, commentCount: 2 })));
    open("/admin?view=hidden");
    expect(await screen.findByText("Naughty words")).toBeInTheDocument();
    expect(screen.getByText("3 likes · 2 comments")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Author Person" })).toHaveAttribute("href", "/u/author");
    expect(screen.getByRole("link", { name: "Open post" })).toHaveAttribute("href", "/posts/p1");
  });

  it("shows hidden text as plain text, never as HTML", async () => {
    const evil = '<img src=x onerror="alert(1)">';
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1", content: evil })));
    const { container } = open("/admin?view=hidden");
    expect(await screen.findByText(evil)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("switches to hidden comments and links to their post", async () => {
    admin.listHiddenComments.mockResolvedValue(page(makeStaffComment({ id: "c1", postId: "post-9", content: "Rude comment" })));
    open("/admin?view=hidden");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Comments" }));
    expect(await screen.findByText("Rude comment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open post" })).toHaveAttribute("href", "/posts/post-9");
  });

  it("unhides a post without needing a report, and it leaves the list", async () => {
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1" }), makeStaffPost({ id: "p2", content: "Other hidden" })));
    open("/admin?view=hidden");
    const user = userEvent.setup();
    const card = (await screen.findByText("Hidden post p1")).closest("article")!;
    await user.click(within(card).getByRole("button", { name: "Unhide post" }));
    await waitFor(() => expect(screen.queryByText("Hidden post p1")).toBeNull());
    expect(arg(admin.unhidePost)).toBe("p1");
    expect(screen.getByText("Other hidden")).toBeInTheDocument();
  });

  it("unhides a comment with the comment endpoint", async () => {
    admin.listHiddenComments.mockResolvedValue(page(makeStaffComment({ id: "c1" })));
    open("/admin?view=hidden&kind=comments");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Unhide comment" }));
    await waitFor(() => expect(admin.unhideComment).toHaveBeenCalled());
    expect(arg(admin.unhideComment)).toBe("c1");
  });

  it("explains a failed unhide", async () => {
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1" })));
    admin.unhidePost.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    open("/admin?view=hidden");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Unhide post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no longer exists");
  });

  it("pages with the cursor", async () => {
    admin.listHiddenPosts
      .mockResolvedValueOnce({ items: [makeStaffPost({ id: "p1" })], nextCursor: "N1" })
      .mockResolvedValueOnce(page(makeStaffPost({ id: "p2" })));
    open("/admin?view=hidden");
    await screen.findByText("Hidden post p1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Hidden post p2")).toBeInTheDocument();
    expect(arg(admin.listHiddenPosts, 1)).toEqual({ cursor: "N1" });
  });

  it("marks a suspended author and does not link to their profile", async () => {
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1", authorStatus: "SUSPENDED" })));
    open("/admin?view=hidden");
    await screen.findByText("Hidden post p1");
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Author Person" })).toBeNull();
  });

  it("offers author actions to admins only", async () => {
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1" })));
    const { unmount } = open("/admin?view=hidden");
    await screen.findByText("Hidden post p1");
    expect(screen.queryByRole("button", { name: "Suspend author" })).toBeNull();
    unmount();
    meRef.current = makeMe({ role: "ADMIN" });
    open("/admin?view=hidden");
    expect(await screen.findByRole("button", { name: "Suspend author" })).toBeInTheDocument();
  });

  it("lets an admin suspend the author after confirming, and the card then offers Reinstate", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    admin.listHiddenPosts.mockResolvedValue(page(makeStaffPost({ id: "p1" })));
    open("/admin?view=hidden");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Suspend author" }));
    await user.click(within(screen.getByRole("dialog", { name: "Suspend @author?" })).getByRole("button", { name: "Suspend" }));
    expect(await screen.findByRole("button", { name: "Reinstate author" })).toBeInTheDocument();
    expect(arg(admin.suspendUser)).toBe("u-author");
  });
});

describe("people (admins)", () => {
  beforeEach(() => {
    meRef.current = makeMe({ id: "u-me", role: "ADMIN" });
  });

  it("lists suspended accounts by default", async () => {
    admin.listUsers.mockResolvedValue(page(makeStaffUser({ id: "u-ann", displayName: "Ann Lee" })));
    open("/admin?view=people");
    expect(await screen.findByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reinstate account" })).toBeInTheDocument();
    expect(arg(admin.listUsers)).toEqual({ status: "SUSPENDED", q: undefined, cursor: undefined });
  });

  it("switches to active accounts", async () => {
    open("/admin?view=people");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Active" }));
    await waitFor(() => expect(admin.listUsers.mock.calls.some((c) => (c[0] as { status: string }).status === "ACTIVE")).toBe(true));
  });

  it("searches by username after a short pause, and not for a single letter", async () => {
    open("/admin?view=people");
    const user = userEvent.setup();
    const box = await screen.findByLabelText("Find by username");
    await user.type(box, "a");
    await new Promise((r) => setTimeout(r, 450));
    expect(admin.listUsers.mock.calls.every((c) => (c[0] as { q?: string }).q === undefined)).toBe(true);
    await user.type(box, "nn");
    await waitFor(() => expect(admin.listUsers.mock.calls.some((c) => (c[0] as { q?: string }).q === "ann")).toBe(true), { timeout: 2000 });
  });

  it("says when nobody matches", async () => {
    open("/admin?view=people");
    expect(await screen.findByText("No suspended accounts.")).toBeInTheDocument();
  });

  it("offers no action on admins or on yourself", async () => {
    admin.listUsers.mockResolvedValue(
      page(
        makeStaffUser({ id: "u-boss", displayName: "Boss", role: "ADMIN", status: "ACTIVE" }),
        makeStaffUser({ id: "u-me", displayName: "Me Myself", role: "MODERATOR", status: "ACTIVE" }),
      ),
    );
    open("/admin?view=people");
    await screen.findByText("Boss");
    expect(screen.getByText("Admins can’t be suspended.")).toBeInTheDocument();
    expect(screen.getByText("This is you.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Suspend|Reinstate) (account|author)$/ })).toBeNull();
  });

  it("reinstates a suspended account and it leaves the list", async () => {
    admin.listUsers.mockResolvedValueOnce(page(makeStaffUser({ id: "u-ann", displayName: "Ann Lee" }))).mockResolvedValue(page());
    open("/admin?view=people");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Reinstate account" }));
    await waitFor(() => expect(screen.queryByText("Ann Lee")).toBeNull());
    expect(arg(admin.reinstateUser)).toBe("u-ann");
  });

  it("suspends an active account after confirming, and it leaves the active list", async () => {
    admin.listUsers
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce(page(makeStaffUser({ id: "u-bo", displayName: "Bo Ray", status: "ACTIVE" })))
      .mockResolvedValue(page());
    open("/admin?view=people");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Active" }));
    await user.click(await screen.findByRole("button", { name: "Suspend account" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    await waitFor(() => expect(screen.queryByText("Bo Ray")).toBeNull());
    expect(arg(admin.suspendUser)).toBe("u-bo");
  });
});

describe("richer report cards", () => {
  const withAuthor = (over: Parameters<typeof makeReport>[0]) =>
    makeReport({ targetAuthorId: "u-author", targetAuthorUsername: "author", targetAuthorStatus: "ACTIVE", ...over });

  it("opens the post of a reported comment and links to its author", async () => {
    admin.listReports.mockResolvedValue(page(withAuthor({ id: "1", targetType: "COMMENT", targetPostId: "post-7" })));
    open();
    expect(await screen.findByRole("link", { name: "Open post" })).toHaveAttribute("href", "/posts/post-7");
    expect(screen.getByRole("link", { name: "@author" })).toHaveAttribute("href", "/u/author");
    expect(screen.getByText(/Written by/)).toBeInTheDocument();
  });

  it("still has no post link when the comment's post is unknown", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", targetType: "COMMENT" })));
    open();
    await screen.findByText("Reported text 1");
    expect(screen.queryByRole("link", { name: "Open post" })).toBeNull();
  });

  it("names the person on a person report", async () => {
    admin.listReports.mockResolvedValue(
      page(withAuthor({ id: "1", targetType: "USER", targetId: "u-author", targetStatus: "ACTIVE" })),
    );
    open();
    expect(await screen.findByText(/Person:/)).toBeInTheDocument();
  });

  it("shows a suspended author without a profile link", async () => {
    admin.listReports.mockResolvedValue(page(withAuthor({ id: "1", targetAuthorStatus: "SUSPENDED" })));
    open();
    await screen.findByText("Reported text 1");
    expect(screen.queryByRole("link", { name: "@author" })).toBeNull();
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("shows nothing about an author when the target is gone", async () => {
    admin.listReports.mockResolvedValue(page(makeReport({ id: "1", targetStatus: "DELETED" })));
    open();
    await screen.findByText("Reported text 1");
    expect(screen.queryByText(/Written by/)).toBeNull();
  });

  it("gives moderators no author actions on a post report", async () => {
    admin.listReports.mockResolvedValue(page(withAuthor({ id: "1" })));
    open();
    await screen.findByText("Reported text 1");
    expect(screen.queryByRole("button", { name: /Suspend author|Reinstate author/ })).toBeNull();
  });

  it("lets an admin suspend the author of a reported post, and every report by them shows it", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    admin.listReports.mockResolvedValue(page(withAuthor({ id: "1" }), withAuthor({ id: "2", targetType: "COMMENT", targetPostId: "p" })));
    open();
    const user = userEvent.setup();
    const buttons = await screen.findAllByRole("button", { name: "Suspend author" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]!);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Reinstate author" })).toHaveLength(2));
    expect(arg(admin.suspendUser)).toBe("u-author");
  });

  it("lets an admin reinstate a suspended author", async () => {
    meRef.current = makeMe({ role: "ADMIN" });
    admin.listReports.mockResolvedValue(page(withAuthor({ id: "1", targetAuthorStatus: "SUSPENDED" })));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Reinstate author" }));
    expect(await screen.findByRole("button", { name: "Suspend author" })).toBeInTheDocument();
    expect(arg(admin.reinstateUser)).toBe("u-author");
  });
});
