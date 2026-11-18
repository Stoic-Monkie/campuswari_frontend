import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as postsApi from "../../api/endpoints/posts";
import { ApiError } from "../../api/errors";
import { makeMe, makePost } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { FeedPage } from "./FeedPage";

vi.mock("../../api/endpoints/posts");
const posts = vi.mocked(postsApi);

const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));

const firstArgs = (fn: { mock: { calls: unknown[][] } }, i = 0) => fn.mock.calls[i]?.[0];

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe();
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("FeedPage", () => {
  it("lists posts newest first as the API returns them", async () => {
    posts.listPosts.mockResolvedValue({ items: [makePost({ id: "a" }), makePost({ id: "b" })], nextCursor: null });
    renderPage(<FeedPage />, { route: "/" });
    expect(await screen.findByText("Post a")).toBeInTheDocument();
    const items = screen.getAllByRole("article").map((a) => a.textContent ?? "");
    expect(items[0]).toContain("Post a");
    expect(items[1]).toContain("Post b");
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });

  it("loads the next page with the cursor from the previous one", async () => {
    posts.listPosts
      .mockResolvedValueOnce({ items: [makePost({ id: "a" })], nextCursor: "CUR1" })
      .mockResolvedValueOnce({ items: [makePost({ id: "b" })], nextCursor: null });
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post a");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Post b")).toBeInTheDocument();
    expect(firstArgs(posts.listPosts, 1)).toEqual({ cursor: "CUR1" });
  });

  it("shows an empty state", async () => {
    posts.listPosts.mockResolvedValue({ items: [], nextCursor: null });
    renderPage(<FeedPage />, { route: "/" });
    expect(await screen.findByText("No stories yet")).toBeInTheDocument();
  });

  it("shows an error with a retry", async () => {
    posts.listPosts.mockRejectedValueOnce(new ApiError({ status: 500, code: "INTERNAL_ERROR", errorId: "E1" }));
    posts.listPosts.mockResolvedValueOnce({ items: [makePost({ id: "a" })], nextCursor: null });
    renderPage(<FeedPage />, { route: "/" });
    expect(await screen.findByRole("alert")).toHaveTextContent("E1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Post a")).toBeInTheDocument();
  });

  it("puts a new post at the top without reloading the feed", async () => {
    posts.listPosts.mockResolvedValue({ items: [makePost({ id: "a" })], nextCursor: null });
    posts.createPost.mockResolvedValue(makePost({ id: "new", content: "Fresh story" }));
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post a");
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "  Fresh story  ");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(screen.getAllByRole("article")[0]).toHaveTextContent("Fresh story"));
    expect(firstArgs(posts.createPost)).toEqual({ content: "Fresh story" });
    expect(posts.listPosts).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("only offers delete on your own posts, then removes the post after confirming", async () => {
    posts.listPosts.mockResolvedValue({
      items: [
        makePost({ id: "mine", author: { id: "u-me", username: "me", displayName: "Me Myself" } }),
        makePost({ id: "theirs" }),
      ],
      nextCursor: null,
    });
    posts.deletePost.mockResolvedValue(undefined);
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post mine");
    expect(screen.getAllByRole("button", { name: "Delete post" })).toHaveLength(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete post" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Post mine")).toBeNull());
    expect(firstArgs(posts.deletePost)).toBe("mine");
    expect(screen.getByText("Post theirs")).toBeInTheDocument();
  });

  it("lets a moderator delete anyone's post", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    posts.listPosts.mockResolvedValue({ items: [makePost({ id: "theirs" })], nextCursor: null });
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post theirs");
    expect(screen.getByRole("button", { name: "Delete post" })).toBeInTheDocument();
  });

  it("closes the confirm dialog with Cancel and keeps the post", async () => {
    posts.listPosts.mockResolvedValue({
      items: [makePost({ id: "mine", author: { id: "u-me", username: "me", displayName: "Me" } })],
      nextCursor: null,
    });
    renderPage(<FeedPage />, { route: "/" });
    await screen.findByText("Post mine");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete post" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(posts.deletePost).not.toHaveBeenCalled();
  });
});

describe("Composer", () => {
  beforeEach(() => posts.listPosts.mockResolvedValue({ items: [], nextCursor: null }));

  it("keeps Post disabled for empty or whitespace-only text", async () => {
    renderPage(<FeedPage />, { route: "/" });
    const button = await screen.findByRole("button", { name: "Post" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(button).toBeDisabled();
  });

  it("counts characters like the server (an emoji is one) and blocks over-long text", async () => {
    renderPage(<FeedPage />, { route: "/" });
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "😀😀" } });
    expect(screen.getByText("2/2000")).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "x".repeat(2001) } });
    expect(screen.getByText("2001/2000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("shows the wait and disables Post when rate limited, and keeps the text", async () => {
    posts.createPost.mockRejectedValue(new ApiError({ status: 429, code: "RATE_LIMITED", retryAfter: 45 }));
    renderPage(<FeedPage />, { route: "/" });
    const box = await screen.findByRole("textbox");
    const user = userEvent.setup();
    await user.type(box, "hello");
    await user.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("45 seconds");
    expect(screen.getByRole("button", { name: /Wait 45s/ })).toBeDisabled();
    expect(box).toHaveValue("hello");
  });
});
