import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProfile } from "../../api/endpoints/users";
import { ApiError } from "../../api/errors";
import { keys } from "../../api/queryKeys";
import { Avatar } from "../../components/Avatar";
import { ErrorState } from "../../components/states";
import { describeError } from "../../lib/errorMessages";
import { PostList } from "../feed/PostList";
import { useMe } from "../me/useMe";
import { SafetyMenu } from "../moderation/SafetyMenu";
import { useUserPosts } from "./useUserPosts";

function joined(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function ProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const me = useMe().data;
  const profile = useQuery({
    queryKey: keys.profile(username),
    queryFn: () => getProfile(username),
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 1,
  });
  // Only fetch the posts once we know the profile is visible (404 covers unknown, suspended and blocked).
  const posts = useUserPosts(username, profile.isSuccess);

  if (profile.isPending) {
    return (
      <p role="status" className="py-8 text-center text-sm text-muted">
        Loading…
      </p>
    );
  }

  if (profile.error instanceof ApiError && profile.error.status === 404) {
    return (
      <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
        <p className="font-medium">This profile isn’t available</p>
        <p className="mt-1 text-sm text-muted">It may not exist, or you can’t see it.</p>
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return <ErrorState message={describeError(profile.error)} onRetry={() => void profile.refetch()} />;
  }

  const p = profile.data;
  const isMe = me?.id === p.id;

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-card border border-line bg-card p-4">
        <div className="flex items-start gap-4">
          <Avatar name={p.displayName} src={p.avatarUrl} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-medium">{p.displayName}</h1>
            <p className="truncate text-sm text-muted">@{p.username}</p>
            {joined(p.createdAt) ? <p className="mt-1 text-xs text-muted">Joined {joined(p.createdAt)}</p> : null}
          </div>
          {isMe ? (
            <Link
              to="/settings"
              aria-label="Edit profile and settings"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium hover:bg-line/40"
            >
              <Settings size={16} aria-hidden="true" /> Edit
            </Link>
          ) : (
            <SafetyMenu
              author={{ id: p.id, username: p.username }}
              targetType="USER"
              targetId={p.id}
              onRemoved={() => navigate("/", { replace: true })}
            />
          )}
        </div>
        {p.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{p.bio}</p> : null}
      </header>

      <h2 className="text-sm font-medium text-muted">Posts</h2>
      <PostList
        query={posts}
        queryKey={keys.userPosts(username)}
        emptyTitle={isMe ? "You haven’t posted yet" : "No posts yet"}
        {...(isMe ? { emptyHint: "Share your first story from the home screen." } : {})}
      />
    </div>
  );
}
