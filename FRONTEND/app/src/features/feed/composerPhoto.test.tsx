import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as postsApi from "../../api/endpoints/posts";
import * as uploadsApi from "../../api/endpoints/uploads";
import { ApiError } from "../../api/errors";
import { makePost } from "../../test/factories";
import { renderPage } from "../../test/utils";
import { PrepareError } from "../uploads/prepareImage";
import { Composer } from "./Composer";

vi.mock("../../api/endpoints/posts");
vi.mock("../../api/endpoints/uploads");
vi.mock("../uploads/prepareImage", async (orig) => ({
  ...(await orig<typeof import("../uploads/prepareImage")>()),
  prepareImage: vi.fn(),
}));
import { prepareImage } from "../uploads/prepareImage";

const posts = vi.mocked(postsApi);
const uploads = vi.mocked(uploadsApi);
const prepare = vi.mocked(prepareImage);

const jpeg = new Blob(["converted"], { type: "image/jpeg" });
const picked = () => new File(["raw"], "photo.heic", { type: "image/jpeg" });
const ticket = {
  uploadId: "up1",
  method: "PUT",
  uploadUrl: "https://r2.example/put",
  headers: { "Content-Type": "image/jpeg" },
  expiresAt: "2026-11-15T00:05:00Z",
};
const finished = { id: "up1", status: "READY", purpose: "POST_IMAGE", url: "https://m.example/a.jpg", width: 4, height: 4 };

let putStatus = 200;
beforeEach(() => {
  putStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/auth/refresh")
        ? new Response("{}", { status: 401 })
        : new Response(null, { status: putStatus }),
    ),
  );
  prepare.mockResolvedValue(jpeg);
  uploads.createUpload.mockResolvedValue(ticket);
  uploads.completeUpload.mockResolvedValue(finished);
  posts.createPost.mockResolvedValue(makePost({ id: "new", content: "With photo", imageUrl: finished.url }));
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function attach(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Choose a photo"), picked());
  await screen.findByAltText("Photo to attach");
}

describe("Composer with a photo", () => {
  it("shows a preview after picking, converted for the API, and lets you remove it", async () => {
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await attach(user);
    expect(prepare.mock.calls[0]?.[1]).toEqual({ maxSide: 2048 });
    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByAltText("Photo to attach")).toBeNull();
  });

  it("uploads first, then creates the post with the upload id", async () => {
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await attach(user);
    await user.type(screen.getByRole("textbox"), "With photo");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(posts.createPost).toHaveBeenCalled());
    expect(uploads.createUpload.mock.calls[0]?.[0]).toEqual({ purpose: "POST_IMAGE", contentType: "image/jpeg", size: jpeg.size });
    expect(posts.createPost.mock.calls[0]?.[0]).toEqual({ content: "With photo", imageUploadId: "up1" });
    expect(uploads.completeUpload.mock.invocationCallOrder[0]!).toBeLessThan(posts.createPost.mock.invocationCallOrder[0]!);
    await waitFor(() => expect(screen.queryByAltText("Photo to attach")).toBeNull());
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("posts without an upload when there is no photo", async () => {
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "Text only");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(posts.createPost).toHaveBeenCalled());
    expect(posts.createPost.mock.calls[0]?.[0]).toEqual({ content: "Text only" });
    expect(uploads.createUpload).not.toHaveBeenCalled();
  });

  it("keeps the text and photo when the upload fails, and does not post", async () => {
    putStatus = 403;
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await attach(user);
    await user.type(screen.getByRole("textbox"), "Keep me");
    await user.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/expired/);
    expect(posts.createPost).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("Keep me");
    expect(screen.getByAltText("Photo to attach")).toBeInTheDocument();
  });

  it("does not upload again when only creating the post failed", async () => {
    posts.createPost.mockRejectedValueOnce(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await attach(user);
    await user.type(screen.getByRole("textbox"), "Retry me");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(posts.createPost).toHaveBeenCalledTimes(2));
    expect(uploads.createUpload).toHaveBeenCalledTimes(1);
    expect(posts.createPost.mock.calls[1]?.[0]).toEqual({ content: "Retry me", imageUploadId: "up1" });
  });

  it("uploads again after a 400, because the photo may have been rejected or used", async () => {
    posts.createPost.mockRejectedValueOnce(new ApiError({ status: 400, code: "BAD_REQUEST" }));
    renderPage(<Composer />, { route: "/" });
    const user = userEvent.setup();
    await attach(user);
    await user.type(screen.getByRole("textbox"), "Again");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(posts.createPost).toHaveBeenCalledTimes(2));
    expect(uploads.createUpload).toHaveBeenCalledTimes(2);
  });

  it("explains a photo the browser cannot read", async () => {
    prepare.mockRejectedValue(new PrepareError("This image format isn’t supported here. Try a JPEG or PNG."));
    renderPage(<Composer />, { route: "/" });
    await userEvent.setup().upload(screen.getByLabelText("Choose a photo"), picked());
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn’t supported/);
    expect(screen.queryByAltText("Photo to attach")).toBeNull();
  });
});
