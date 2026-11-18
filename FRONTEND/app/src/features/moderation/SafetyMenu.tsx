import { useState } from "react";
import type { ReportTarget } from "../../api/endpoints/reports";
import { ApiError } from "../../api/errors";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Menu, type MenuItem } from "../../components/Menu";
import { staffActionError } from "../admin/staffErrors";
import { useHideContent, useSuspendUser } from "../admin/useStaffActions";
import { describeError } from "../../lib/errorMessages";
import { isAdmin, isStaff } from "../me/roles";
import { useMe } from "../me/useMe";
import { useBlockUser } from "./blocking";
import { ReportDialog } from "./ReportDialog";

interface SafetyMenuProps {
  author: { id: string; username: string };
  targetType: ReportTarget;
  targetId: string;
  /** Called after the content or person is gone for us (blocked, hidden, suspended), for example to leave the page. */
  onRemoved?: () => void;
}

const reportLabel: Record<ReportTarget, string> = {
  POST: "Report post",
  COMMENT: "Report comment",
  USER: "Report this person",
};

type Dialog = "report" | "block" | "hide" | "suspend" | null;

/**
 * The "more" menu on other people's posts, comments and profiles. Everyone gets report and block;
 * moderators also get "Hide" on posts and comments, and admins get "Suspend" on profiles.
 * Hidden on your own content.
 */
export function SafetyMenu({ author, targetType, targetId, onRemoved }: SafetyMenuProps) {
  const me = useMe().data;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const block = useBlockUser();
  const hide = useHideContent();
  const suspend = useSuspendUser();

  if (!me || me.id === author.id) return null;

  const open = (d: Dialog) => () => {
    setError(null);
    setDialog(d);
  };
  const done = () => {
    setDialog(null);
    onRemoved?.();
  };

  const items: MenuItem[] = [
    { label: reportLabel[targetType], onSelect: open("report") },
    { label: `Block @${author.username}`, danger: true, onSelect: open("block") },
  ];
  if (isStaff(me) && targetType !== "USER") {
    items.push({
      label: targetType === "POST" ? "Hide post (staff)" : "Hide comment (staff)",
      danger: true,
      onSelect: open("hide"),
    });
  }
  if (isAdmin(me) && targetType === "USER") {
    items.push({ label: `Suspend @${author.username} (admin)`, danger: true, onSelect: open("suspend") });
  }

  const word = targetType === "POST" ? "post" : "comment";

  return (
    <>
      <Menu label="More options" items={items} />

      {dialog === "report" ? (
        <ReportDialog targetType={targetType} targetId={targetId} onClose={() => setDialog(null)} />
      ) : null}

      {dialog === "block" ? (
        <ConfirmDialog
          title={`Block @${author.username}?`}
          message="You won’t see each other’s posts, comments or profiles. They aren’t told. You can unblock them in Settings."
          confirmLabel="Block"
          busy={block.isPending}
          error={error}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            block.mutate(author.id, {
              onSuccess: done,
              onError: (e) =>
                setError(e instanceof ApiError && e.status === 404 ? "That account isn’t available." : describeError(e)),
            })
          }
        />
      ) : null}

      {dialog === "hide" ? (
        <ConfirmDialog
          title={`Hide this ${word}?`}
          message="Students will no longer see it. This is recorded in the audit log."
          confirmLabel="Hide"
          busy={hide.isPending}
          error={error}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            hide.mutate(
              { type: targetType as "POST" | "COMMENT", id: targetId },
              { onSuccess: done, onError: (e) => setError(staffActionError(e, "hide")) },
            )
          }
        />
      ) : null}

      {dialog === "suspend" ? (
        <ConfirmDialog
          title={`Suspend @${author.username}?`}
          message="They are logged out at once and can’t log in until reinstated. Their posts and comments disappear. This is recorded in the audit log."
          confirmLabel="Suspend"
          busy={suspend.isPending}
          error={error}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            suspend.mutate(author.id, { onSuccess: done, onError: (e) => setError(staffActionError(e, "suspend")) })
          }
        />
      ) : null}
    </>
  );
}
