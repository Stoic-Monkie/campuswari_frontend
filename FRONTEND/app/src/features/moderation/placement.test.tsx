import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as blocksApi from "../../api/endpoints/blocks";
import * as commentsApi from "../../api/endpoints/comments";
import * as postsApi from "../../api/endpoints/posts";
import * as usersApi from "../../api/endpoints/users";
import { makeMe, makePost } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { CommentSection } from "../comments/CommentSection";
import { FeedPage } from "../feed/FeedPage";
import { ProfilePage } from "../profile/ProfilePage";

vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/comments");
vi.mock("../../api/endpoints/users");
vi.mock("../../api/endpoints/blocks");
vi.mock("../../api/endpoints/likes");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const posts = vi.mocked(postsApi);
const comments = vi.mocked(commentsApi);
const users = vi.mocked(usersApi);
const blocks = vi.mocked(blocksApi);

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe();
  blocks.blockUser.mockResolvedValue(undefined);
  blocks.listBlocks.mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("where the report and block menu appears", () => {
  it("shows on other people's posts in the feed, not on your own", async () => {
    posts.listPosts.mockResolvedValue({
      items: [
        makePost({ id: "mine", author: { id: "u-me", username: "me", displayName: "Me" } }),
        makePost({ id: "theirs" }),
      ],
      nextCursor: null,
    });
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post theirs");
    expect(screen.getAllByRole("button", { name: "More options" })).toHaveLength(1);
  });

  it("removes a blocked person's posts from the feed straight away", async () => {
    posts.listPosts.mockResolvedValue({
      items: [makePost({ id: "theirs" }), makePost({ id: "third", author: { id: "u-third", username: "third", displayName: "Third" } })],
      nextCursor: null,
    });
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post theirs");
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "More options" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Block @other" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Block" }));
    await waitFor(() => expect(screen.queryByText("Post theirs")).toBeNull());
    expect(screen.getByText("Post third")).toBeInTheDocument();
    expect(blocks.blockUser.mock.calls[0]?.[0]).toBe("u-other");
  });

  it("shows on other people's comments, not on your own", async () => {
    const c = (id: string, authorId: string) => ({
      id,
      postId: "p1",
      author: { id: authorId, username: authorId.replace("u-", ""), displayName: authorId },
      content: `Comment ${id}`,
      createdAt: new Date().toISOString(),
    });
    comments.listComments.mockResolvedValue({ items: [c("c1", "u-other"), c("c2", "u-me")], nextCursor: null });
    renderPage(<CommentSection postId="p1" />, { route: "/" });
    await screen.findByText("Comment c1");
    expect(screen.getAllByRole("button", { name: "More options" })).toHaveLength(1);
  });
});

describe("profile page", () => {
  const profile = (id: string, username: string) => ({ id, username, displayName: username, createdAt: "2026-01-01T00:00:00Z" });
  const open = (name: string) =>
    renderPage(<ProfilePage />, { route: `/u/${name}`, path: "/u/:username", extra: [{ path: "/", element: <p>feed</p> }] });

  beforeEach(() => users.listUserPosts.mockResolvedValue({ items: [], nextCursor: null }));

  it("lets you block someone from their profile and leaves the page", async () => {
    users.getProfile.mockResolvedValue(profile("u-other", "other"));
    open("other");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Block @other" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Block" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/"));
    expect(screen.getByText("feed")).toBeInTheDocument();
    expect(blocks.blockUser.mock.calls[0]?.[0]).toBe("u-other");
  });

  it("offers a report for the person too", async () => {
    users.getProfile.mockResolvedValue(profile("u-other", "other"));
    open("other");
    await userEvent.setup().click(await screen.findByRole("button", { name: "More options" }));
    expect(screen.getByRole("menuitem", { name: "Report this person" })).toBeInTheDocument();
  });

  it("has no menu on your own profile", async () => {
    users.getProfile.mockResolvedValue(profile("u-me", "me"));
    open("me");
    await screen.findByRole("heading", { name: "me" });
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
  });
});
