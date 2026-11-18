import { useInfiniteQuery } from "@tanstack/react-query";
import { listHiddenComments, listHiddenPosts, listUsers, type AccountStatus } from "../../api/endpoints/admin";
import { keys } from "../../api/queryKeys";

const first = undefined as string | undefined;

export function useHiddenPosts() {
  return useInfiniteQuery({
    queryKey: keys.adminHiddenPosts,
    queryFn: ({ pageParam }) => listHiddenPosts({ cursor: pageParam }),
    initialPageParam: first,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useHiddenComments() {
  return useInfiniteQuery({
    queryKey: keys.adminHiddenComments,
    queryFn: ({ pageParam }) => listHiddenComments({ cursor: pageParam }),
    initialPageParam: first,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Admin only. `q` must already be 2 to 30 characters, or undefined for no search. */
export function useStaffUsers(status: AccountStatus, q: string | undefined) {
  return useInfiniteQuery({
    queryKey: keys.adminUsers(status, q ?? ""),
    queryFn: ({ pageParam }) => listUsers({ status, q, cursor: pageParam }),
    initialPageParam: first,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
