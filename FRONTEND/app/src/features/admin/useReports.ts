import { useInfiniteQuery } from "@tanstack/react-query";
import { listReports, type ReportStatus } from "../../api/endpoints/admin";
import { keys } from "../../api/queryKeys";

export function useReports(status: ReportStatus) {
  return useInfiniteQuery({
    queryKey: keys.adminReports(status),
    queryFn: ({ pageParam }) => listReports({ status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
