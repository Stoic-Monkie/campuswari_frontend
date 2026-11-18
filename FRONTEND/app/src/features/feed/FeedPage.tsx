import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { keys } from "../../api/queryKeys";
import { Composer } from "./Composer";
import { PostList } from "./PostList";
import { useFeed } from "./useFeed";

export function FeedPage() {
  const queryClient = useQueryClient();
  const feed = useFeed();

  return (
    <div className="flex flex-col gap-4">
      <Composer />

      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-muted">Latest</h1>
        <button
          type="button"
          onClick={() => void queryClient.resetQueries({ queryKey: keys.feed })}
          aria-label="Refresh feed"
          disabled={feed.isFetching}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg disabled:opacity-50"
        >
          <RefreshCw size={18} aria-hidden="true" className={feed.isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      <PostList query={feed} queryKey={keys.feed} emptyTitle="No stories yet" emptyHint="Be the first to share one." />
    </div>
  );
}
