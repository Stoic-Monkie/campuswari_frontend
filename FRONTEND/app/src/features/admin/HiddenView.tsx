import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { StaffComment, StaffPost } from "../../api/schemas";
import { Button } from "../../components/Button";
import { fullDate, timeAgo } from "../../lib/time";
import { AuthorActions } from "./AuthorActions";
import { statusLabel } from "./labels";
import { StaffList } from "./StaffList";
import { staffActionError } from "./staffErrors";
import { useHiddenComments, useHiddenPosts } from "./useStaffLists";
import { useUnhideContent } from "./useStaffActions";

const badge = "rounded-full border border-line px-2 py-0.5 text-xs";

function AuthorLine({ username, displayName, status, createdAt }: { username: string; displayName: string; status: string; createdAt: string }) {
  return (
    <p className="text-xs text-muted">
      {status === "ACTIVE" ? (
        <Link to={`/u/${username}`} className="font-medium text-fg underline">
          {displayName}
        </Link>
      ) : (
        <span className="font-medium text-fg">{displayName}</span>
      )}{" "}
      @{username}
      {status !== "ACTIVE" ? <span className={`${badge} ml-2`}>{statusLabel(status)}</span> : null} ·{" "}
      <time dateTime={createdAt} title={fullDate(createdAt)}>
        {timeAgo(createdAt)}
      </time>
    </p>
  );
}

function UnhideButton({ type, id }: { type: "POST" | "COMMENT"; id: string }) {
  const unhide = useUnhideContent();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="secondary"
        disabled={unhide.isPending}
        onClick={() => {
          setError(null);
          unhide.mutate({ type, id }, { onError: (e) => setError(staffActionError(e, "unhide")) });
        }}
      >
        {type === "POST" ? "Unhide post" : "Unhide comment"}
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function HiddenPostCard({ post, isAdmin }: { post: StaffPost; isAdmin: boolean }) {
  return (
    <article className="rounded-card border border-line bg-card p-4">
      <AuthorLine username={post.author.username} displayName={post.author.displayName} status={post.authorStatus} createdAt={post.createdAt} />
      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={`Photo in a hidden post by ${post.author.displayName}`}
          loading="lazy"
          className="mt-2 max-h-48 rounded-lg border border-line object-cover"
        />
      ) : null}
      <p className="mt-2 text-xs text-muted">
        {post.likeCount} likes · {post.commentCount} comments
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/posts/${post.id}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-line/40"
        >
          Open post
        </Link>
        <UnhideButton type="POST" id={post.id} />
        {isAdmin ? (
          <AuthorActions authorId={post.author.id} username={post.author.username} status={post.authorStatus} noun="author" />
        ) : null}
      </div>
    </article>
  );
}

function HiddenCommentCard({ comment, isAdmin }: { comment: StaffComment; isAdmin: boolean }) {
  return (
    <article className="rounded-card border border-line bg-card p-4">
      <AuthorLine username={comment.author.username} displayName={comment.author.displayName} status={comment.authorStatus} createdAt={comment.createdAt} />
      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{comment.content}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/posts/${comment.postId}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-line/40"
        >
          Open post
        </Link>
        <UnhideButton type="COMMENT" id={comment.id} />
        {isAdmin ? (
          <AuthorActions authorId={comment.author.id} username={comment.author.username} status={comment.authorStatus} noun="author" />
        ) : null}
      </div>
    </article>
  );
}

function HiddenPosts({ isAdmin }: { isAdmin: boolean }) {
  const query = useHiddenPosts();
  return <StaffList query={query} empty="No hidden posts." render={(p) => <HiddenPostCard post={p} isAdmin={isAdmin} />} />;
}

function HiddenComments({ isAdmin }: { isAdmin: boolean }) {
  const query = useHiddenComments();
  return <StaffList query={query} empty="No hidden comments." render={(c) => <HiddenCommentCard comment={c} isAdmin={isAdmin} />} />;
}

/** Everything a moderator hid, so it can be found and unhidden again without a report. */
export function HiddenView({ isAdmin }: { isAdmin: boolean }) {
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") === "comments" ? "comments" : "posts";
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Hidden content type" className="flex gap-2">
        {(["posts", "comments"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={k === kind}
            onClick={() => setParams({ view: "hidden", ...(k === "comments" ? { kind: "comments" } : {}) })}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              k === kind ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-fg"
            }`}
          >
            {k === "posts" ? "Posts" : "Comments"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Newest first. Unhiding makes it visible to everyone again.</p>
      {kind === "posts" ? <HiddenPosts isAdmin={isAdmin} /> : <HiddenComments isAdmin={isAdmin} />}
    </div>
  );
}
