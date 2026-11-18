import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { createReport, type ReportReason, type ReportTarget } from "../../api/endpoints/reports";
import { ApiError } from "../../api/errors";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { Modal } from "../../components/Modal";
import { describeError } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { cpLength } from "../../lib/text";
import { REPORT_REASONS } from "./reasons";

const targetWord: Record<ReportTarget, string> = { POST: "post", COMMENT: "comment", USER: "person" };

interface ReportDialogProps {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}

export function ReportDialog({ targetType, targetId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    // 201 (new) and 200 (already reported) both mean the moderators have it.
    mutationFn: () => {
      const body = { targetType, targetId, reason: reason!, ...(details.trim() ? { details: details.trim() } : {}) };
      return createReport(body);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 404) {
        setError(`This ${targetWord[targetType]} is no longer available.`);
        return;
      }
      if (e instanceof ApiError && e.status === 400 && e.detail) {
        setError(e.detail);
        return;
      }
      setError(describeError(e));
    },
  });

  const detailsLength = cpLength(details);
  const tooLong = detailsLength > LIMITS.reportDetails;
  const canSend = reason !== null && !tooLong && !mutation.isPending;

  if (mutation.isSuccess) {
    return (
      <Modal title="Thanks for letting us know" onClose={onClose}>
        <p className="mt-1 text-sm text-muted">
          A moderator will take a look. The person isn’t told who reported them.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Report this ${targetWord[targetType]}`} onClose={onClose}>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          setError(null);
          mutation.mutate();
        }}
      >
        <fieldset>
          <legend className="text-sm font-medium">What’s wrong?</legend>
          <div className="mt-1 flex flex-col">
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex min-h-11 items-start gap-3 py-1.5 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-0.5"
                />
                <span>
                  {r.label}
                  <span className="block text-xs text-muted">{r.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="report-details" className="block text-sm font-medium">
            More details (optional)
          </label>
          <textarea
            id="report-details"
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            aria-describedby="report-count"
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-accent"
          />
          <p id="report-count" className={`mt-1 text-xs ${tooLong ? "text-danger" : "text-muted"}`}>
            {detailsLength}/{LIMITS.reportDetails}
          </p>
        </div>

        {error ? <FormAlert>{error}</FormAlert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSend}>
            {mutation.isPending ? "Sending…" : "Send report"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
