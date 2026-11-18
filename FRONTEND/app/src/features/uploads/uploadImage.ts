import { completeUpload, createUpload, type UploadPurpose } from "../../api/endpoints/uploads";
import { ApiError, ErrorCode } from "../../api/errors";
import type { Upload } from "../../api/schemas";
import { describeError } from "../../lib/errorMessages";

/** A failure with a message that is ready to show to the user. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export type UploadStage = "requesting" | "uploading" | "finishing";

export interface UploadDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onStage?: (stage: UploadStage) => void;
}

// The browser sets these itself and refuses to let scripts set them.
const FORBIDDEN_HEADERS = new Set(["content-length", "host", "connection", "transfer-encoding"]);

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fromApi(e: unknown): UploadError {
  if (e instanceof UploadError) return e;
  if (e instanceof ApiError) {
    if (e.code === ErrorCode.EmailNotVerified) return new UploadError("Confirm your email before adding photos.");
    if (e.code === ErrorCode.RateLimited || e.status === 429) return new UploadError(describeError(e));
    if (e.status === 400) return new UploadError(e.detail ?? "That image can’t be used. Try another one.");
  }
  return new UploadError(describeError(e));
}

/**
 * The three-step upload: (1) get a presigned URL, (2) PUT the file straight to storage
 * with exactly the headers we were given (no bearer token, the file never passes
 * through the API), (3) tell the API to check it. Returns the finished upload.
 * The Blob must already be the final JPEG, because its type and size are signed.
 */
export async function uploadImage(blob: Blob, purpose: UploadPurpose, deps: UploadDeps = {}): Promise<Upload> {
  const doFetch = deps.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const sleep = deps.sleep ?? defaultSleep;

  deps.onStage?.("requesting");
  let ticket;
  try {
    ticket = await createUpload({ purpose, contentType: blob.type, size: blob.size });
  } catch (e) {
    throw fromApi(e);
  }

  deps.onStage?.("uploading");
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(ticket.headers)) {
    if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) headers[k] = v;
  }
  let put: Response;
  try {
    put = await doFetch(ticket.uploadUrl, {
      method: ticket.method || "PUT",
      headers,
      body: blob,
      credentials: "omit",
    });
  } catch {
    if (import.meta.env.DEV) {
      console.warn("Upload to storage failed before any response. Usually the storage server's CORS rule is missing, or its address is not reachable from the browser (see docs/frontend/storage-setup.md).");
    }
    throw new UploadError("Couldn’t reach the image server. Check your connection and try again.");
  }
  if (!put.ok) {
    throw new UploadError(
      put.status === 403
        ? "The upload link expired. Please try again."
        : "The image couldn’t be uploaded. Please try again.",
    );
  }

  deps.onStage?.("finishing");
  try {
    return await completeUpload(ticket.uploadId);
  } catch (first) {
    // A 400 can mean "the file has not shown up in storage yet": try once more shortly.
    if (first instanceof ApiError && first.status === 400) {
      await sleep(800);
      try {
        return await completeUpload(ticket.uploadId);
      } catch (second) {
        throw fromApi(second);
      }
    }
    throw fromApi(first);
  }
}
