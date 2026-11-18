import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Comment } from "../../api/schemas";
import { Avatar } from "../../components/Avatar";
import { fullDate, timeAgo } from "../../lib/time";

interface CommentItemProps {
  comment: Comment;
  canDelete?: boolean;
  onDelete?: (comment: Comment) => void;
  /** Extra controls, such as the report and block menu. */
  menu?: ReactNode;
}

export function CommentItem({ comment, canDelete, onDelete, menu }: CommentItemProps) {
  const { author } = comment;
  return (
    <article className="flex gap-3 py-3">
      <Link to={`/u/${author.username}`} aria-label={`${author.displayName}, profile`} className="shrink-0">
        <Avatar name={author.displayName} src={author.avatarUrl} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted">
          <Link to={`/u/${author.username}`} className="text-sm font-medium text-fg hover:underline">
            {author.displayName}
          </Link>{" "}
          @{author.username} ·{" "}
          <time dateTime={comment.createdAt} title={fullDate(comment.createdAt)}>
            {timeAgo(comment.createdAt)}
          </time>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{comment.content}</p>
      </div>
      {canDelete && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(comment)}
          aria-label="Delete comment"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-danger"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      ) : null}
      {menu}
    </article>
  );
}
