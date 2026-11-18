import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReportResolution } from "../../api/endpoints/admin";
import type { Report } from "../../api/schemas";
import { Button } from "../../components/Button";
import { fullDate, timeAgo } from "../../lib/time";
import { AuthorActions } from "./AuthorActions";
import { reasonLabel, statusLabel, targetLabel } from "./labels";
import { staffActionError } from "./staffErrors";
import { useHideContent, useResolveReport, useUnhideContent } from "./useStaffActions";

const badge = "rounded-full border border-line px-2 py-0.5 text-xs";
const linkButton =
  "inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-line/40";

export function ReportCard({ report, isAdmin }: { report: Report; isAdmin: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const hide = useHideContent();
  const unhide = useUnhideContent();
  const resolve = useResolveReport();

  const busy = hide.isPending || unhide.isPending || resolve.isPending;
  const isContent = report.targetType === "POST" || report.targetType === "COMMENT";
  const type = report.targetType as "POST" | "COMMENT";

  // Patch 14 tells us who wrote the target. For a person report the author is the person themselves,
  // so older API answers without these fields still work for that case.
  const authorId = report.targetAuthorId ?? (report.targetType === "USER" ? report.targetId : null);
  const authorStatus = report.targetAuthorStatus ?? (report.targetType === "USER" ? report.targetStatus : null);
  const authorName = report.targetAuthorUsername ?? null;
  // A post report links to the post itself; a comment report links to the comment's post.
  const postId = report.targetType === "POST" ? report.targetId : report.targetType === "COMMENT" ? report.targetPostId : null;

  function run<T>(
    m: { mutate: (v: T, o: { onError: (e: unknown) => void }) => void },
    v: T,
    action: Parameters<typeof staffActionError>[1],
  ) {
    setError(null);
    m.mutate(v, { onError: (e) => setError(staffActionError(e, action)) });
  }

  const resolveWith = (resolution: ReportResolution) => run(resolve, { id: report.id, resolution }, "resolve");

  return (
    <article className="rounded-card border border-line bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className={`${badge} font-medium`}>{targetLabel(report.targetType)}</span>
        <span className={badge}>{reasonLabel(report.reason)}</span>
        <span className={`${badge} text-muted`} aria-label={`Target status: ${statusLabel(report.targetStatus)}`}>
          {statusLabel(report.targetStatus)}
        </span>
      </header>

      {authorName ? (
        <p className="mt-2 text-xs text-muted">
          {report.targetType === "USER" ? "Person: " : "Written by "}
          {authorStatus === "ACTIVE" ? (
            <Link to={`/u/${authorName}`} className="font-medium text-fg underline">
              @{authorName}
            </Link>
          ) : (
            <span className="font-medium text-fg">@{authorName}</span>
          )}
          {authorStatus && authorStatus !== "ACTIVE" ? (
            <span className={`${badge} ml-2`}>{statusLabel(authorStatus)}</span>
          ) : null}
        </p>
      ) : null}

      {report.targetPreview ? (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-line bg-bg p-3 text-sm">
          {report.targetPreview}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">(no preview)</p>
      )}

      {report.details ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
          <span className="text-muted">Reporter’s note: </span>
          {report.details}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-muted">
        Reported by{" "}
        <Link to={`/u/${report.reporterUsername}`} className="underline">
          @{report.reporterUsername}
        </Link>{" "}
        ·{" "}
        <time dateTime={report.createdAt} title={fullDate(report.createdAt)}>
          {timeAgo(report.createdAt)}
        </time>
      </p>

      {report.status !== "OPEN" ? (
        <p className="mt-1 text-xs text-muted">
          {statusLabel(report.status)}
          {report.resolvedBy ? ` by ${report.resolvedBy}` : ""}
          {report.resolvedAt ? ` · ${fullDate(report.resolvedAt)}` : ""}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {postId ? (
          <Link to={`/posts/${postId}`} className={linkButton}>
            Open post
          </Link>
        ) : null}

        {isContent && report.targetStatus === "VISIBLE" ? (
          <Button variant="danger" disabled={busy} onClick={() => run(hide, { type, id: report.targetId }, "hide")}>
            {report.targetType === "POST" ? "Hide post" : "Hide comment"}
          </Button>
        ) : null}
        {isContent && report.targetStatus === "HIDDEN" ? (
          <Button variant="secondary" disabled={busy} onClick={() => run(unhide, { type, id: report.targetId }, "unhide")}>
            {report.targetType === "POST" ? "Unhide post" : "Unhide comment"}
          </Button>
        ) : null}

        {isAdmin && authorId && authorName !== null ? (
          <AuthorActions
            authorId={authorId}
            username={authorName}
            status={authorStatus}
            noun={report.targetType === "USER" ? "account" : "author"}
          />
        ) : null}
        {isAdmin && authorId && authorName === null && report.targetType === "USER" ? (
          // Older API answers have no username: still allow the action, named generically.
          <AuthorActions authorId={authorId} username="this person" status={authorStatus} noun="account" />
        ) : null}
        {report.targetType === "USER" && !isAdmin ? (
          <p className="self-center text-xs text-muted">Only admins can suspend accounts.</p>
        ) : null}

        {report.status === "OPEN" ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => resolveWith("DISMISSED")}>
              Dismiss
            </Button>
            <Button disabled={busy} onClick={() => resolveWith("ACTIONED")}>
              Mark actioned
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
