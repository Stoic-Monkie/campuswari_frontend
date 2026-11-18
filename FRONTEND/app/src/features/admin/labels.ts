import { REPORT_REASONS } from "../moderation/reasons";

export function reasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

const statusLabels: Record<string, string> = {
  VISIBLE: "Visible",
  HIDDEN: "Hidden",
  DELETED: "Deleted",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  OPEN: "Open",
  ACTIONED: "Actioned",
  DISMISSED: "Dismissed",
};

export function statusLabel(value: string): string {
  return statusLabels[value] ?? value;
}

const targetLabels: Record<string, string> = { POST: "Post", COMMENT: "Comment", USER: "Person" };

export function targetLabel(value: string): string {
  return targetLabels[value] ?? value;
}
