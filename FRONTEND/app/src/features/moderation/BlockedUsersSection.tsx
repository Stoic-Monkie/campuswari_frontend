import { useInfiniteQuery } from "@tanstack/react-query";
import { listBlocks } from "../../api/endpoints/blocks";
import { keys } from "../../api/queryKeys";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { EmptyState, ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { useUnblockUser } from "./blocking";

export function BlockedUsersSection() {
  const blocks = useInfiniteQuery({
    queryKey: keys.blocks,
    queryFn: ({ pageParam }) => listBlocks({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const unblock = useUnblockUser();
  const items = blocks.data?.pages.flatMap((p) => p.items) ?? [];

  if (blocks.isPending) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading…
      </p>
    );
  }
  if (blocks.isError && items.length === 0) {
    return <ErrorState message={describeError(blocks.error)} onRetry={() => void blocks.refetch()} />;
  }
  if (items.length === 0) return <EmptyState title="You haven’t blocked anyone" />;

  return (
    <div className="flex flex-col gap-2">
      {unblock.isError ? (
        <p role="alert" className="text-sm text-danger">
          {describeError(unblock.error)}
        </p>
      ) : null}
      <ul className="divide-y divide-line">
        {items.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-2">
            <Avatar name={u.displayName} src={u.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.displayName}</p>
              <p className="truncate text-xs text-muted">@{u.username}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => unblock.mutate(u.id)}
              disabled={unblock.isPending && unblock.variables === u.id}
              aria-label={`Unblock @${u.username}`}
            >
              Unblock
            </Button>
          </li>
        ))}
      </ul>
      {blocks.hasNextPage ? (
        <Button variant="secondary" onClick={() => void blocks.fetchNextPage()} disabled={blocks.isFetchingNextPage}>
          {blocks.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
