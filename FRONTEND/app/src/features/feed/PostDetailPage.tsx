import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getPost } from "../../api/endpoints/posts";
import { ApiError } from "../../api/errors";
import { keys } from "../../api/queryKeys";
import { ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { CommentSection } from "../comments/CommentSection";
import { useMe } from "../me/useMe";
import { SafetyMenu } from "../moderation/SafetyMenu";
import { findPostInFeed } from "./feedCache";
import { canDeletePost } from "./permissions";
import { PostCard } from "./PostCard";
import { usePostDeletion } from "./usePostDeletion";

export function PostDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe().data;

  const post = useQuery({
    queryKey: keys.post(id),
    queryFn: () => getPost(id),
    // Paint instantly from the feed while the fresh copy loads.
    placeholderData: () => findPostInFeed(queryClient, id),
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 1,
  });

  const deletion = usePostDeletion(() => navigate("/", { replace: true }));

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/");
  };

  const unavailable = post.error instanceof ApiError && post.error.status === 404;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-lg font-medium">Post</h1>
      </div>

      {post.isPending ? (
        <p role="status" className="py-8 text-center text-sm text-muted">
          Loading…
        </p>
      ) : unavailable ? (
        <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
          <p className="font-medium">This post isn’t available</p>
          <p className="mt-1 text-sm text-muted">It may have been deleted, or you can’t see it.</p>
        </div>
      ) : post.isError || !post.data ? (
        <ErrorState message={describeError(post.error)} onRetry={() => void post.refetch()} />
      ) : (
        <>
          <PostCard
            post={post.data}
            linkToPost={false}
            canDelete={canDeletePost(post.data, me)}
            onDelete={deletion.request}
            menu={
              <SafetyMenu
                author={post.data.author}
                targetType="POST"
                targetId={post.data.id}
                onRemoved={() => navigate("/", { replace: true })}
              />
            }
          />
          <CommentSection postId={post.data.id} onPostGone={() => void post.refetch()} />
        </>
      )}
      {deletion.dialog}
    </div>
  );
}
