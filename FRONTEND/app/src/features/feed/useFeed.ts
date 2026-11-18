import { useInfiniteQuery } from "@tanstack/react-query";
import { listPosts } from "../../api/endpoints/posts";
import { keys } from "../../api/queryKeys";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: keys.feed,
    queryFn: ({ pageParam }) => listPosts({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
