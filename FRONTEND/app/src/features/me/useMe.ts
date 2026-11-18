import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/endpoints/users";
import { keys } from "../../api/queryKeys";
import { useSession } from "../../session/SessionProvider";

/** The signed-in user (id, role, email-verified ...). Disabled until the session is ready. */
export function useMe() {
  const { status } = useSession();
  return useQuery({ queryKey: keys.me, queryFn: getMe, enabled: status === "authenticated", staleTime: 5 * 60_000 });
}
