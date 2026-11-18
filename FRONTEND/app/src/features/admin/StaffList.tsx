import type { ReactNode } from "react";
import { Button } from "../../components/Button";
import { EmptyState, ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";

/** The part of an infinite query a staff list needs. */
export interface StaffListQuery<T> {
  data: { pages: { items: T[] }[] } | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

interface StaffListProps<T extends { id: string }> {
  query: StaffListQuery<T>;
  empty: string;
  render: (item: T) => ReactNode;
}

/** Loading, empty, error and "load more" for any paged staff list. */
export function StaffList<T extends { id: string }>({ query, empty, render }: StaffListProps<T>) {
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isPending) {
    return (
      <p role="status" className="py-8 text-center text-sm text-muted">
        Loading…
      </p>
    );
  }
  if (query.isError && items.length === 0) {
    return <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />;
  }
  if (items.length === 0) return <EmptyState title={empty} />;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>{render(item)}</li>
        ))}
      </ul>
      {query.isFetchNextPageError ? (
        <ErrorState message={describeError(query.error)} onRetry={() => void query.fetchNextPage()} />
      ) : query.hasNextPage ? (
        <Button variant="secondary" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </>
  );
}
