import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPost } from "../../api/endpoints/posts";
import { ApiError, ErrorCode } from "../../api/errors";
import type { Post } from "../../api/schemas";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { cpLength } from "../../lib/text";
import { useCooldown } from "../../lib/useCooldown";
import { UploadError, uploadImage, type UploadStage } from "../uploads/uploadImage";
import { useAttachedImage } from "../uploads/useAttachedImage";
import { addPostToFeed } from "./feedCache";

interface ComposerProps {
  onPosted?: (post: Post) => void;
  autoFocus?: boolean;
}

const stageText: Record<UploadStage, string> = {
  requesting: "Preparing photo…",
  uploading: "Uploading photo…",
  finishing: "Checking photo…",
};

export function Composer({ onPosted, autoFocus }: ComposerProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  // Once the photo is uploaded we keep its id, so a failed post can be retried without uploading again.
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cooldown = useCooldown();
  const photo = useAttachedImage({ maxSide: LIMITS.postImageSide });

  const length = cpLength(text);
  const trimmed = text.trim();
  const tooLong = length > LIMITS.post;

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      let imageUploadId = uploadedId;
      if (photo.blob && !imageUploadId) {
        const upload = await uploadImage(photo.blob, "POST_IMAGE", { onStage: setStage });
        imageUploadId = upload.id;
        setUploadedId(upload.id);
      }
      setStage(null);
      return createPost(imageUploadId ? { content, imageUploadId } : { content });
    },
    onSuccess: (post) => {
      setText("");
      setError(null);
      setUploadedId(null);
      photo.clear();
      addPostToFeed(queryClient, post);
      onPosted?.(post);
    },
    onError: (e) => {
      setStage(null);
      if (e instanceof UploadError) {
        setError(e.message);
        return;
      }
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      // A 400 may mean the photo was rejected or used up; upload again on the next try to be safe.
      if (e instanceof ApiError && e.status === 400) setUploadedId(null);
      if (e instanceof ApiError && e.code === ErrorCode.EmailNotVerified) {
        setError("Confirm your email before posting.");
        return;
      }
      if (e instanceof ApiError && e.code === ErrorCode.ValidationFailed && e.detail) {
        setError(e.detail);
        return;
      }
      setError(describeError(e));
    },
  });

  const busy = mutation.isPending || photo.busy;
  const canSubmit = trimmed.length > 0 && !tooLong && !busy && cooldown.remaining === 0;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    mutation.mutate(trimmed);
  }

  function removePhoto() {
    photo.clear();
    setUploadedId(null);
  }

  return (
    <section aria-label="New post" className="rounded-card border border-line bg-card p-4">
      <label htmlFor="composer" className="sr-only">
        What’s happening on campus?
      </label>
      <textarea
        id="composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        autoFocus={autoFocus}
        placeholder="What’s happening on campus?"
        aria-describedby="composer-count"
        className="w-full resize-y bg-transparent text-base placeholder:text-muted focus-visible:outline-none"
      />

      {photo.previewUrl ? (
        <div className="relative mb-3 w-fit">
          <img
            src={photo.previewUrl}
            alt="Photo to attach"
            className="max-h-60 rounded-lg border border-line object-cover"
          />
          <button
            type="button"
            onClick={removePhoto}
            disabled={mutation.isPending}
            aria-label="Remove photo"
            className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {photo.error || error ? (
        <div className="mb-3">
          <FormAlert>{photo.error ?? error}</FormAlert>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                setUploadedId(null);
                void photo.pick(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            aria-label="Add a photo"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg disabled:opacity-50"
          >
            <ImagePlus size={20} aria-hidden="true" />
          </button>
          <span id="composer-count" className={`text-xs ${tooLong ? "text-danger" : "text-muted"}`}>
            {length}/{LIMITS.post}
          </span>
        </div>
        <Button onClick={submit} disabled={!canSubmit}>
          {photo.busy
            ? "Preparing photo…"
            : stage
              ? stageText[stage]
              : mutation.isPending
                ? "Posting…"
                : cooldown.remaining > 0
                  ? `Wait ${cooldown.remaining}s`
                  : "Post"}
        </Button>
      </div>
    </section>
  );
}
