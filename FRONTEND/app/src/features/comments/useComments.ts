import { useInfiniteQuery } from "@tanstack/react-query";
import { listComments } from "../../api/endpoints/comments";
import { keys } from "../../api/queryKeys";

export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId),
    queryFn: ({ pageParam }) => listComments(postId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
