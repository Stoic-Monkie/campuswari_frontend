import { api } from "../client";
import { reportCreatedSchema } from "../schemas";

export type ReportTarget = "POST" | "COMMENT" | "USER";
export type ReportReason = "SPAM" | "HARASSMENT" | "HATE" | "NSFW" | "IMPERSONATION" | "OTHER";

/** 201 for a new report, 200 if you already reported this target (the original is returned). */
export function createReport(body: {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string;
}) {
  return api.request("/reports", { method: "POST", body, schema: reportCreatedSchema });
}
