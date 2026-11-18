import { useInfiniteQuery } from "@tanstack/react-query";
import { listUserPosts } from "../../api/endpoints/users";
import { keys } from "../../api/queryKeys";

export function useUserPosts(username: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.userPosts(username),
    queryFn: ({ pageParam }) => listUserPosts(username, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
