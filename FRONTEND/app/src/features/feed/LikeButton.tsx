import { Heart } from "lucide-react";
import type { Post } from "../../api/schemas";
import { describeError } from "../../lib/errorMessages";
import { useToggleLike } from "./useToggleLike";

export function LikeButton({ post }: { post: Post }) {
  const toggle = useToggleLike();
  const label = `${post.likedByMe ? "Unlike" : "Like"} (${post.likeCount} ${post.likeCount === 1 ? "like" : "likes"})`;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={post.likedByMe}
        aria-label={label}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate({ id: post.id, like: !post.likedByMe })}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg pr-2 ${
          post.likedByMe ? "text-spark" : "text-muted hover:text-fg"
        }`}
      >
        <Heart size={20} aria-hidden="true" fill={post.likedByMe ? "currentColor" : "none"} /> {post.likeCount}
      </button>
      {toggle.isError ? (
        <span role="status" className="text-xs text-danger">
          {describeError(toggle.error)}
        </span>
      ) : null}
    </span>
  );
}
