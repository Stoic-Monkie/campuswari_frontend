import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createComment } from "../../api/endpoints/comments";
import { ApiError, ErrorCode } from "../../api/errors";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { cpLength } from "../../lib/text";
import { useCooldown } from "../../lib/useCooldown";
import { patchPostInCaches } from "../feed/feedCache";
import { appendComment } from "./commentCache";

export function CommentComposer({ postId, onGone }: { postId: string; onGone?: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const length = cpLength(text);
  const trimmed = text.trim();
  const tooLong = length > LIMITS.comment;

  const mutation = useMutation({
    mutationFn: (content: string) => createComment(postId, content),
    onSuccess: (comment) => {
      setText("");
      setError(null);
      appendComment(queryClient, postId, comment);
      patchPostInCaches(queryClient, postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 404) {
        onGone?.();
        return;
      }
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      if (e instanceof ApiError && e.code === ErrorCode.ValidationFailed && e.detail) {
        setError(e.detail);
        return;
      }
      setError(describeError(e));
    },
  });

  const canSubmit = trimmed.length > 0 && !tooLong && !mutation.isPending && cooldown.remaining === 0;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    mutation.mutate(trimmed);
  }

  return (
    <section aria-label="Add a comment" className="rounded-card border border-line bg-card p-3">
      <label htmlFor="comment-box" className="sr-only">
        Write a comment
      </label>
      <textarea
        id="comment-box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder="Write a comment…"
        aria-describedby="comment-count"
        className="w-full resize-y bg-transparent text-base placeholder:text-muted focus-visible:outline-none"
      />
      {error ? (
        <div className="mb-2">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span id="comment-count" className={`text-xs ${tooLong ? "text-danger" : "text-muted"}`}>
          {length}/{LIMITS.comment}
        </span>
        <Button onClick={submit} disabled={!canSubmit}>
          {mutation.isPending ? "Sending…" : cooldown.remaining > 0 ? `Wait ${cooldown.remaining}s` : "Comment"}
        </Button>
      </div>
    </section>
  );
}
