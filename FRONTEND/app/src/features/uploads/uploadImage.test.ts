import { afterEach, describe, expect, it, vi } from "vitest";
import * as uploadsApi from "../../api/endpoints/uploads";
import { ApiError } from "../../api/errors";
import { uploadImage, UploadError, type UploadStage } from "./uploadImage";

vi.mock("../../api/endpoints/uploads");
const api = vi.mocked(uploadsApi);

const blob = new Blob(["jpeg-bytes"], { type: "image/jpeg" });
const ticket = {
  uploadId: "up1",
  method: "PUT",
  uploadUrl: "https://r2.example/put?sig=abc",
  headers: { "Content-Type": "image/jpeg", "Content-Length": "10", Host: "r2.example" },
  expiresAt: "2026-11-15T00:05:00Z",
};
const done = { id: "up1", status: "READY", purpose: "POST_IMAGE", url: "https://media.example/img/x.jpg", width: 10, height: 10 };

const okFetch = () => vi.fn(async () => new Response(null, { status: 200 }));
const rejected = async (p: Promise<unknown>) => (await p.catch((e: unknown) => e)) as UploadError;

afterEach(() => vi.clearAllMocks());

describe("uploadImage", () => {
  it("asks for a ticket, PUTs the file with the signed headers, then completes", async () => {
    api.createUpload.mockResolvedValue(ticket);
    api.completeUpload.mockResolvedValue(done);
    const fetchImpl = okFetch();
    const stages: UploadStage[] = [];

    const result = await uploadImage(blob, "POST_IMAGE", { fetchImpl, onStage: (s) => stages.push(s) });

    expect(result).toEqual(done);
    expect(api.createUpload.mock.calls[0]?.[0]).toEqual({ purpose: "POST_IMAGE", contentType: "image/jpeg", size: blob.size });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ticket.uploadUrl);
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(blob);
    expect(init.credentials).toBe("omit");
    // The signed headers are sent exactly, except those the browser sets itself.
    expect(init.headers).toEqual({ "Content-Type": "image/jpeg" });
    expect(api.completeUpload.mock.calls[0]?.[0]).toBe("up1");
    expect(stages).toEqual(["requesting", "uploading", "finishing"]);
  });

  it("says the link expired when storage answers 403, and does not complete", async () => {
    api.createUpload.mockResolvedValue(ticket);
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }));
    const err = await rejected(uploadImage(blob, "AVATAR", { fetchImpl }));
    expect(err).toBeInstanceOf(UploadError);
    expect(err.message).toMatch(/expired/);
    expect(api.completeUpload).not.toHaveBeenCalled();
  });

  it("reports a network or CORS failure in plain words", async () => {
    api.createUpload.mockResolvedValue(ticket);
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const err = await rejected(uploadImage(blob, "AVATAR", { fetchImpl }));
    expect(err.message).toMatch(/Couldn’t reach the image server/);
  });

  it("retries complete once after a 400 (file not in storage yet)", async () => {
    api.createUpload.mockResolvedValue(ticket);
    api.completeUpload
      .mockRejectedValueOnce(new ApiError({ status: 400, code: "BAD_REQUEST" }))
      .mockResolvedValueOnce(done);
    const sleep = vi.fn(async () => undefined);
    const result = await uploadImage(blob, "POST_IMAGE", { fetchImpl: okFetch(), sleep });
    expect(result).toEqual(done);
    expect(api.completeUpload).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("gives up with the server's reason after two 400s", async () => {
    api.createUpload.mockResolvedValue(ticket);
    api.completeUpload.mockRejectedValue(new ApiError({ status: 400, code: "BAD_REQUEST", detail: "Image is too large." }));
    const err = await rejected(uploadImage(blob, "POST_IMAGE", { fetchImpl: okFetch(), sleep: async () => undefined }));
    expect(err.message).toBe("Image is too large.");
    expect(api.completeUpload).toHaveBeenCalledTimes(2);
  });

  it("shows the wait time when rate limited", async () => {
    api.createUpload.mockRejectedValue(new ApiError({ status: 429, code: "RATE_LIMITED", retryAfter: 120 }));
    const fetchImpl = okFetch();
    const err = await rejected(uploadImage(blob, "POST_IMAGE", { fetchImpl }));
    expect(err.message).toMatch(/2 minutes/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("asks unverified users to confirm their email", async () => {
    api.createUpload.mockRejectedValue(new ApiError({ status: 403, code: "EMAIL_NOT_VERIFIED" }));
    const err = await rejected(uploadImage(blob, "POST_IMAGE", { fetchImpl: okFetch() }));
    expect(err.message).toMatch(/Confirm your email/);
  });
});
