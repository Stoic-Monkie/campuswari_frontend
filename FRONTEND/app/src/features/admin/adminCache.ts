import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queryKeys";
import type { Report, ReportPage, StaffComment, StaffPost, StaffUser } from "../../api/schemas";

type Queue = InfiniteData<ReportPage, string | undefined>;

function mapQueues(queryClient: QueryClient, change: (items: Report[]) => Report[]) {
  queryClient.setQueriesData<Queue>({ queryKey: keys.adminReportsAll }, (old) =>
    old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: change(p.items) })) } : old,
  );
}

/** After hide, unhide, suspend or reinstate: every report about the same target shows its new status. */
export function setTargetStatus(queryClient: QueryClient, targetType: string, targetId: string, targetStatus: string) {
  mapQueues(queryClient, (items) =>
    items.map((r) => (r.targetType === targetType && r.targetId === targetId ? { ...r, targetStatus } : r)),
  );
}

/** A resolved report leaves its queue straight away; the other queues reload. */
export function removeReportFromQueues(queryClient: QueryClient, reportId: string) {
  mapQueues(queryClient, (items) => items.filter((r) => r.id !== reportId));
  void queryClient.invalidateQueries({ queryKey: keys.adminReportsAll });
}

type Listing<T> = InfiniteData<{ items: T[]; nextCursor?: string | null | undefined }, string | undefined>;

function mapListing<T>(queryClient: QueryClient, key: readonly unknown[], change: (items: T[]) => T[]) {
  queryClient.setQueriesData<Listing<T>>({ queryKey: key }, (old) =>
    old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: change(p.items) })) } : old,
  );
}

/** Unhidden content leaves the hidden lists straight away. */
export function removeHiddenItem(queryClient: QueryClient, type: "POST" | "COMMENT", id: string) {
  if (type === "POST") {
    mapListing<StaffPost>(queryClient, keys.adminHiddenPosts, (items) => items.filter((i) => i.id !== id));
  } else {
    mapListing<StaffComment>(queryClient, keys.adminHiddenComments, (items) => items.filter((i) => i.id !== id));
  }
}

/** After suspend or reinstate: everywhere this person appears as an author now shows the new status. */
export function setAuthorStatus(queryClient: QueryClient, authorId: string, status: "ACTIVE" | "SUSPENDED") {
  mapQueues(queryClient, (items) =>
    items.map((r) => {
      let next = r;
      if (r.targetAuthorId === authorId) next = { ...next, targetAuthorStatus: status };
      if (r.targetType === "USER" && r.targetId === authorId) next = { ...next, targetStatus: status };
      return next;
    }),
  );
  mapListing<StaffPost>(queryClient, keys.adminHiddenPosts, (items) =>
    items.map((i) => (i.author.id === authorId ? { ...i, authorStatus: status } : i)),
  );
  mapListing<StaffComment>(queryClient, keys.adminHiddenComments, (items) =>
    items.map((i) => (i.author.id === authorId ? { ...i, authorStatus: status } : i)),
  );
  // The people lists are filtered by status, so the person no longer belongs in this one: drop the row and reload.
  mapListing<StaffUser>(queryClient, keys.adminUsersAll, (items) => items.filter((u) => u.id !== authorId));
  void queryClient.invalidateQueries({ queryKey: keys.adminUsersAll });
}
