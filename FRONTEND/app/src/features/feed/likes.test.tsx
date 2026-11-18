import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as likesApi from "../../api/endpoints/likes";
import * as postsApi from "../../api/endpoints/posts";
import { ApiError } from "../../api/errors";
import { makeMe, makePost } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { FeedPage } from "./FeedPage";

vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/likes");
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: makeMe() }) }));
const posts = vi.mocked(postsApi);
const likes = vi.mocked(likesApi);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  stubGuestSession();
  posts.listPosts.mockResolvedValue({
    items: [makePost({ id: "a", likeCount: 4 }), makePost({ id: "b", likeCount: 1, likedByMe: true })],
    nextCursor: null,
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("likes", () => {
  it("updates instantly, then takes the server's numbers", async () => {
    const d = deferred<{ likedByMe: boolean; likeCount: number }>();
    likes.likePost.mockReturnValue(d.promise);
    renderPage(<FeedPage />, { route: "/" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Like (4 likes)" }));

    // before the server answers
    expect(screen.getByRole("button", { name: "Unlike (5 likes)" })).toHaveAttribute("aria-pressed", "true");

    d.resolve({ likedByMe: true, likeCount: 9 });
    expect(await screen.findByRole("button", { name: "Unlike (9 likes)" })).toBeInTheDocument();
    expect(likes.likePost.mock.calls[0]?.[0]).toBe("a");
  });

  it("unlikes with the DELETE call", async () => {
    likes.unlikePost.mockResolvedValue({ likedByMe: false, likeCount: 0 });
    renderPage(<FeedPage />, { route: "/" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Unlike (1 like)" }));
    expect(await screen.findByRole("button", { name: "Like (0 likes)" })).toBeInTheDocument();
    expect(likes.unlikePost.mock.calls[0]?.[0]).toBe("b");
  });

  it("puts the old state back and says so when the call fails", async () => {
    likes.likePost.mockRejectedValue(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    renderPage(<FeedPage />, { route: "/" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Like (4 likes)" }));
    expect(await screen.findByRole("button", { name: "Like (4 likes)" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent(/went wrong/i);
  });

  it("removes a post that is no longer visible (404)", async () => {
    likes.likePost.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    renderPage(<FeedPage />, { route: "/" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Like (4 likes)" }));
    await waitFor(() => expect(screen.queryByText("Post a")).toBeNull());
    expect(screen.getByText("Post b")).toBeInTheDocument();
  });
});
