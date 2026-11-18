import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { updateMe } from "../../api/endpoints/users";
import { keys } from "../../api/queryKeys";
import type { Me } from "../../api/schemas";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { FormAlert } from "../../components/FormAlert";
import { describeError } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { refreshAuthorCaches } from "../me/refreshAuthorCaches";
import { PrepareError, prepareImage } from "../uploads/prepareImage";
import { UploadError, uploadImage, type UploadStage } from "../uploads/uploadImage";

const stageText: Record<UploadStage, string> = {
  requesting: "Preparing…",
  uploading: "Uploading…",
  finishing: "Checking…",
};

/** Change your profile photo: pick, crop to a square, upload, attach, done. */
export function AvatarPicker({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: async (file: File) => {
      setStatus("Preparing…");
      const blob = await prepareImage(file, { maxSide: LIMITS.avatarSide, square: true });
      const upload = await uploadImage(blob, "AVATAR", { onStage: (s) => setStatus(stageText[s]) });
      setStatus("Saving…");
      return updateMe({ avatarUploadId: upload.id });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.me, updated);
      refreshAuthorCaches(queryClient, updated.username);
      setDone(true);
    },
    onError: (e) => {
      setDone(false);
      setError(e instanceof PrepareError || e instanceof UploadError ? e.message : describeError(e));
    },
    onSettled: () => setStatus(null),
  });

  return (
    <div className="flex items-center gap-4">
      <Avatar name={me.displayName} src={me.avatarUrl} size={72} />
      <div className="flex flex-col gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a profile photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            setDone(false);
            change.mutate(file);
          }}
        />
        <Button variant="secondary" onClick={() => input.current?.click()} disabled={change.isPending}>
          {status ?? "Change photo"}
        </Button>
        {error ? <FormAlert>{error}</FormAlert> : null}
        {done ? <FormAlert tone="success">Photo updated.</FormAlert> : null}
      </div>
    </div>
  );
}
