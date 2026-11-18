import { useMutation, useQueryClient } from "@tanstack/react-query";
import { blockUser, unblockUser } from "../../api/endpoints/blocks";
import { keys } from "../../api/queryKeys";
import { hideAuthorEverywhere, refreshContentCaches } from "./blockCache";

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: (_d, userId) => {
      hideAuthorEverywhere(queryClient, userId);
      void queryClient.invalidateQueries({ queryKey: keys.blocks });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      refreshContentCaches(queryClient);
      void queryClient.invalidateQueries({ queryKey: keys.blocks });
    },
  });
}
