import type { QueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queryKeys";

/** A name or photo changed: cached posts, comments and profile pages that show it are now out of date. */
export function refreshAuthorCaches(queryClient: QueryClient, username: string) {
  void queryClient.invalidateQueries({ queryKey: keys.feed });
  void queryClient.invalidateQueries({ queryKey: keys.userPostsAll });
  void queryClient.invalidateQueries({ queryKey: keys.profile(username) });
}
