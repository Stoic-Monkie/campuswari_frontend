import { MessageCircle, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../../api/schemas";
import { Avatar } from "../../components/Avatar";
import { fullDate, timeAgo } from "../../lib/time";
import { LikeButton } from "./LikeButton";

interface PostCardProps {
  post: Post;
  /** Show the delete button (author or staff). */
  canDelete?: boolean;
  onDelete?: (post: Post) => void;
  /** Make the text a link to the post page. Off on the post page itself. */
  linkToPost?: boolean;
  /** Extra header controls, such as the report and block menu. */
  menu?: ReactNode;
}

/**
 * One post. User text is rendered as plain text only (React escapes it);
 * never switch this to dangerouslySetInnerHTML.
 */
export function PostCard({ post, canDelete, onDelete, linkToPost = true, menu }: PostCardProps) {
  const { author } = post;
  const commentLabel = `${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`;
  return (
    <article className="rounded-card border border-line bg-card p-4">
      <header className="flex items-center gap-3">
        <Link to={`/u/${author.username}`} aria-label={`${author.displayName}, profile`}>
          <Avatar name={author.displayName} src={author.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${author.username}`} className="block truncate text-sm font-medium hover:underline">
            {author.displayName}
          </Link>
          <p className="truncate text-xs text-muted">
            @{author.username} ·{" "}
            <time dateTime={post.createdAt} title={fullDate(post.createdAt)}>
              {timeAgo(post.createdAt)}
            </time>
          </p>
        </div>
        {canDelete && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(post)}
            aria-label="Delete post"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-danger"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        ) : null}
        {menu}
      </header>

      {linkToPost ? (
        <Link to={`/posts/${post.id}`} className="mt-3 block">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>
        </Link>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>
      )}

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={`Photo posted by ${author.displayName}`}
          loading="lazy"
          className="mt-3 max-h-[32rem] w-full rounded-lg border border-line object-cover"
        />
      ) : null}

      <footer className="mt-3 flex items-center gap-5 text-sm text-muted">
        <LikeButton post={post} />
        {linkToPost ? (
          <Link
            to={`/posts/${post.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg"
            aria-label={commentLabel}
          >
            <MessageCircle size={20} aria-hidden="true" /> {post.commentCount}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5" aria-label={commentLabel}>
            <MessageCircle size={20} aria-hidden="true" /> {post.commentCount}
          </span>
        )}
      </footer>
    </article>
  );
}
