import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  hideComment,
  hidePost,
  reinstateUser,
  resolveReport,
  suspendUser,
  unhideComment,
  unhidePost,
  type ReportResolution,
} from "../../api/endpoints/admin";
import { refreshContentCaches, hideAuthorEverywhere } from "../moderation/blockCache";
import { removePostEverywhere } from "../feed/feedCache";
import { keys } from "../../api/queryKeys";
import { removeHiddenItem, removeReportFromQueues, setAuthorStatus, setTargetStatus } from "./adminCache";

/** Hide a post or comment. Hidden content disappears for readers, so remove it from our caches. */
export function useHideContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: "POST" | "COMMENT"; id: string }) =>
      type === "POST" ? hidePost(id) : hideComment(id),
    onSuccess: (_d, { type, id }) => {
      setTargetStatus(queryClient, type, id, "HIDDEN");
      void queryClient.invalidateQueries({ queryKey: keys.adminHidden });
      if (type === "POST") removePostEverywhere(queryClient, id);
      else refreshContentCaches(queryClient);
    },
  });
}

export function useUnhideContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: "POST" | "COMMENT"; id: string }) =>
      type === "POST" ? unhidePost(id) : unhideComment(id),
    onSuccess: (_d, { type, id }) => {
      setTargetStatus(queryClient, type, id, "VISIBLE");
      removeHiddenItem(queryClient, type, id);
      refreshContentCaches(queryClient);
    },
  });
}

/** Admins only. */
export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendUser(id),
    onSuccess: (_d, id) => {
      setTargetStatus(queryClient, "USER", id, "SUSPENDED");
      setAuthorStatus(queryClient, id, "SUSPENDED");
      hideAuthorEverywhere(queryClient, id);
    },
  });
}

export function useReinstateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reinstateUser(id),
    onSuccess: (_d, id) => {
      setTargetStatus(queryClient, "USER", id, "ACTIVE");
      setAuthorStatus(queryClient, id, "ACTIVE");
      refreshContentCaches(queryClient);
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: ReportResolution }) => resolveReport(id, resolution),
    onSuccess: (_d, { id }) => removeReportFromQueues(queryClient, id),
  });
}
