import type { ReportReason } from "../../api/endpoints/reports";

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "SPAM", label: "Spam", hint: "Ads, scams or repeated junk" },
  { value: "HARASSMENT", label: "Harassment", hint: "Bullying, threats or targeting someone" },
  { value: "HATE", label: "Hate", hint: "Attacks on a group of people" },
  { value: "NSFW", label: "Adult content", hint: "Sexual or graphic material" },
  { value: "IMPERSONATION", label: "Impersonation", hint: "Pretending to be someone else" },
  { value: "OTHER", label: "Something else", hint: "Tell us more below" },
];
