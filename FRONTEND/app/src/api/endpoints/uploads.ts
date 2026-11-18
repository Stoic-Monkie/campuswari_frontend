import { api } from "../client";
import { uploadSchema, uploadTicketSchema } from "../schemas";

export type UploadPurpose = "POST_IMAGE" | "AVATAR";

/** Step 1: ask for a one-shot presigned upload URL. Type and size are signed into it. */
export function createUpload(body: { purpose: UploadPurpose; contentType: string; size: number }) {
  return api.request("/uploads", { method: "POST", body, schema: uploadTicketSchema });
}

/** Step 3: tell the API the file is in storage so it can check and clean it. Idempotent. */
export function completeUpload(id: string) {
  return api.request(`/uploads/${encodeURIComponent(id)}/complete`, { method: "POST", schema: uploadSchema });
}
