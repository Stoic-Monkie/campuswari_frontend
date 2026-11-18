import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as uploadsApi from "../../api/endpoints/uploads";
import * as usersApi from "../../api/endpoints/users";
import { makeMe } from "../../test/factories";
import { renderPage } from "../../test/utils";
import { AvatarPicker } from "./AvatarPicker";

vi.mock("../../api/endpoints/uploads");
vi.mock("../../api/endpoints/users");
vi.mock("../uploads/prepareImage", async (orig) => ({
  ...(await orig<typeof import("../uploads/prepareImage")>()),
  prepareImage: vi.fn(),
}));
import { prepareImage } from "../uploads/prepareImage";

const prepare = vi.mocked(prepareImage);
const uploads = vi.mocked(uploadsApi);
const users = vi.mocked(usersApi);
const jpeg = new Blob(["square"], { type: "image/jpeg" });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/auth/refresh") ? new Response("{}", { status: 401 }) : new Response(null, { status: 200 }),
    ),
  );
  prepare.mockResolvedValue(jpeg);
  uploads.createUpload.mockResolvedValue({
    uploadId: "av1",
    method: "PUT",
    uploadUrl: "https://r2.example/put",
    headers: { "Content-Type": "image/jpeg" },
    expiresAt: "x",
  });
  uploads.completeUpload.mockResolvedValue({ id: "av1", status: "READY", purpose: "AVATAR", url: "u", width: 1, height: 1 });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const pick = () => userEvent.setup().upload(screen.getByLabelText("Choose a profile photo"), new File(["x"], "me.jpg", { type: "image/jpeg" }));

describe("AvatarPicker", () => {
  it("crops to a square, uploads as AVATAR and attaches it to the profile", async () => {
    users.updateMe.mockResolvedValue(makeMe({ avatarUrl: "https://m.example/me.jpg" }));
    renderPage(<AvatarPicker me={makeMe()} />, { route: "/" });
    await pick();
    expect(await screen.findByText("Photo updated.")).toBeInTheDocument();
    expect(prepare.mock.calls[0]?.[1]).toEqual({ maxSide: 512, square: true });
    expect(uploads.createUpload.mock.calls[0]?.[0]).toMatchObject({ purpose: "AVATAR", contentType: "image/jpeg" });
    expect(users.updateMe.mock.calls[0]?.[0]).toEqual({ avatarUploadId: "av1" });
  });

  it("shows why it failed and does not touch the profile", async () => {
    uploads.createUpload.mockRejectedValue(new Error("boom"));
    renderPage(<AvatarPicker me={makeMe()} />, { route: "/" });
    await pick();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Change photo" })).toBeEnabled());
    expect(users.updateMe).not.toHaveBeenCalled();
  });
});
