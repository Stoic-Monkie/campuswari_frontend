import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { ReportStatus } from "../../api/endpoints/admin";
import { keys } from "../../api/queryKeys";
import { Button } from "../../components/Button";
import { EmptyState, ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { ReportCard } from "./ReportCard";
import { useReports } from "./useReports";

const tabs: { value: ReportStatus; label: string; empty: string }[] = [
  { value: "OPEN", label: "Open", empty: "No open reports. All clear." },
  { value: "ACTIONED", label: "Actioned", empty: "Nothing has been actioned yet." },
  { value: "DISMISSED", label: "Dismissed", empty: "Nothing has been dismissed yet." },
];

function parseStatus(v: string | null): ReportStatus {
  return v === "ACTIONED" || v === "DISMISSED" ? v : "OPEN";
}

export function ReportsView({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get("status"));
  const reports = useReports(status);
  const items = reports.data?.pages.flatMap((p) => p.items) ?? [];
  const tab = tabs.find((t) => t.value === status)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div role="group" aria-label="Report status" className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={t.value === status}
              onClick={() => setParams(t.value === "OPEN" ? {} : { status: t.value })}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                t.value === status ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void queryClient.resetQueries({ queryKey: keys.adminReports(status) })}
          aria-label="Refresh reports"
          disabled={reports.isFetching}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg disabled:opacity-50"
        >
          <RefreshCw size={18} aria-hidden="true" className={reports.isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {reports.isPending ? (
        <p role="status" className="py-8 text-center text-sm text-muted">
          Loading…
        </p>
      ) : reports.isError && items.length === 0 ? (
        <ErrorState message={describeError(reports.error)} onRetry={() => void reports.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={tab.empty} />
      ) : (
        <>
          <p className="text-xs text-muted">Oldest first.</p>
          <ul className="flex flex-col gap-3">
            {items.map((r) => (
              <li key={r.id}>
                <ReportCard report={r} isAdmin={isAdmin} />
              </li>
            ))}
          </ul>
          {reports.isFetchNextPageError ? (
            <ErrorState message={describeError(reports.error)} onRetry={() => void reports.fetchNextPage()} />
          ) : reports.hasNextPage ? (
            <Button variant="secondary" onClick={() => void reports.fetchNextPage()} disabled={reports.isFetchingNextPage}>
              {reports.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
