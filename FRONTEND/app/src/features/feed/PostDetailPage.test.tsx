import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as commentsApi from "../../api/endpoints/comments";
import * as postsApi from "../../api/endpoints/posts";
import { ApiError } from "../../api/errors";
import type { Comment } from "../../api/schemas";
import { makeMe, makePost } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { PostDetailPage } from "./PostDetailPage";

vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/comments");
vi.mock("../../api/endpoints/likes");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));

const posts = vi.mocked(postsApi);
const comments = vi.mocked(commentsApi);

const comment = (id: string, authorId = "u-other", content = `Comment ${id}`): Comment => ({
  id,
  postId: "p1",
  author: { id: authorId, username: authorId.replace("u-", ""), displayName: `User ${authorId}` },
  content,
  createdAt: new Date().toISOString(),
});

const extra = [{ path: "/", element: <p>feed</p> }];
const open = () => renderPage(<PostDetailPage />, { route: "/posts/p1", path: "/posts/:id", extra });

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe();
  posts.getPost.mockResolvedValue(makePost({ id: "p1", content: "The post", commentCount: 2 }));
  comments.listComments.mockResolvedValue({ items: [comment("c1"), comment("c2", "u-me")], nextCursor: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("PostDetailPage", () => {
  it("shows the post and its comments oldest first", async () => {
    open();
    expect(await screen.findByText("The post")).toBeInTheDocument();
    const items = (await screen.findAllByText(/^Comment c/)).map((n) => n.textContent);
    expect(items).toEqual(["Comment c1", "Comment c2"]);
    expect(posts.getPost.mock.calls[0]?.[0]).toBe("p1");
  });

  it("says the post isn't available when the API answers 404", async () => {
    posts.getPost.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    open();
    expect(await screen.findByText("This post isn’t available")).toBeInTheDocument();
    expect(screen.queryByText("Comments")).toBeNull();
  });

  it("adds a comment at the end and bumps the comment count", async () => {
    comments.createComment.mockResolvedValue(comment("c3", "u-me", "Brand new"));
    open();
    await screen.findByText("Comment c2");
    expect(screen.getByLabelText("2 comments")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Write a comment" }), "  Brand new  ");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => expect(screen.getAllByText(/^(Comment c|Brand new)/).at(-1)).toHaveTextContent("Brand new"));
    expect(comments.createComment.mock.calls[0]?.slice(0, 2)).toEqual(["p1", "Brand new"]);
    expect(screen.getByLabelText("3 comments")).toBeInTheDocument();
    expect(comments.listComments).toHaveBeenCalledTimes(1);
  });

  it("loads more comments using the cursor", async () => {
    comments.listComments
      .mockResolvedValueOnce({ items: [comment("c1")], nextCursor: "NEXT" })
      .mockResolvedValueOnce({ items: [comment("c2")], nextCursor: null });
    open();
    await screen.findByText("Comment c1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more comments" }));
    expect(await screen.findByText("Comment c2")).toBeInTheDocument();
    expect(comments.listComments.mock.calls[1]?.[1]).toEqual({ cursor: "NEXT" });
  });

  it("lets you delete your own comment only, and lowers the count", async () => {
    comments.deleteComment.mockResolvedValue(undefined);
    open();
    await screen.findByText("Comment c2");
    const buttons = screen.getAllByRole("button", { name: "Delete comment" });
    expect(buttons).toHaveLength(1);

    const user = userEvent.setup();
    await user.click(buttons[0]!);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Comment c2")).toBeNull());
    expect(comments.deleteComment.mock.calls[0]?.[0]).toBe("c2");
    expect(screen.getByLabelText("1 comment")).toBeInTheDocument();
    expect(screen.getByText("Comment c1")).toBeInTheDocument();
  });

  it("does not let the post's author delete other people's comments", async () => {
    posts.getPost.mockResolvedValue(
      makePost({ id: "p1", content: "Mine", author: { id: "u-me", username: "me", displayName: "Me" } }),
    );
    comments.listComments.mockResolvedValue({ items: [comment("c1")], nextCursor: null });
    open();
    await screen.findByText("Comment c1");
    expect(screen.queryByRole("button", { name: "Delete comment" })).toBeNull();
    // but the post itself can be deleted by its author
    expect(screen.getByRole("button", { name: "Delete post" })).toBeInTheDocument();
  });

  it("lets a moderator delete any comment", async () => {
    meRef.current = makeMe({ role: "MODERATOR" });
    open();
    await screen.findByText("Comment c1");
    expect(screen.getAllByRole("button", { name: "Delete comment" })).toHaveLength(2);
  });

  it("goes back to the feed after deleting the post", async () => {
    posts.getPost.mockResolvedValue(
      makePost({ id: "p1", content: "Mine", author: { id: "u-me", username: "me", displayName: "Me" } }),
    );
    posts.deletePost.mockResolvedValue(undefined);
    open();
    await screen.findByText("Mine");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete post" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/"));
    expect(screen.getByText("feed")).toBeInTheDocument();
  });

  it("blocks empty and over-long comments", async () => {
    open();
    await screen.findByText("Comment c1");
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    const send = screen.getByRole("button", { name: "Comment" });
    expect(send).toBeDisabled();
    fireEvent.change(box, { target: { value: "x".repeat(1001) } });
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    expect(send).toBeDisabled();
  });
});
