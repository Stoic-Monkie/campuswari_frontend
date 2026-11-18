import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { logout, logoutAll } from "../../api/endpoints/auth";
import { updateMe } from "../../api/endpoints/users";
import { keys } from "../../api/queryKeys";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormAlert } from "../../components/FormAlert";
import { TextField } from "../../components/TextField";
import { describeError, isRateLimited } from "../../lib/errorMessages";
import { LIMITS } from "../../lib/limits";
import { cpLength } from "../../lib/text";
import { useTheme, type ThemeMode } from "../../lib/theme";
import { useCooldown } from "../../lib/useCooldown";
import { useSession } from "../../session/SessionProvider";
import { applyFieldErrors, serverDetail } from "../auth/serverErrors";
import { displayNameField } from "../auth/validation";
import { refreshAuthorCaches } from "../me/refreshAuthorCaches";
import { useMe } from "../me/useMe";
import { BlockedUsersSection } from "../moderation/BlockedUsersSection";
import { AvatarPicker } from "./AvatarPicker";

const schema = z.object({
  displayName: displayNameField,
  bio: z.string().refine((v) => cpLength(v) <= LIMITS.bio, `At most ${LIMITS.bio} characters`),
});
type Values = z.infer<typeof schema>;

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-medium">Settings</h1>
      <ProfileSection />
      <Section title="Blocked people">
        <BlockedUsersSection />
      </Section>
      <AppearanceSection />
      <SessionSection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSection() {
  const queryClient = useQueryClient();
  const me = useMe().data;
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { displayName: "", bio: "" } });

  // Fill the form once the profile has loaded.
  useEffect(() => {
    if (me) reset({ displayName: me.displayName, bio: me.bio ?? "" });
  }, [me, reset]);

  const bioLength = cpLength(watch("bio") ?? "");

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.me, updated);
      reset({ displayName: updated.displayName, bio: updated.bio ?? "" });
      // Names show on posts and comments, so cached copies are now out of date.
      refreshAuthorCaches(queryClient, updated.username);
      setSaved(true);
    },
    onError: (e) => {
      if (applyFieldErrors(e, setError, ["displayName", "bio"])) return;
      if (isRateLimited(e) && e.retryAfter) cooldown.start(e.retryAfter);
      setServerError(serverDetail(e) ?? describeError(e));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSaved(false);
    // Send only what changed. An empty bio is a real value: it clears the bio.
    const body: { displayName?: string; bio?: string } = {};
    if (dirtyFields.displayName) body.displayName = values.displayName.trim();
    if (dirtyFields.bio) body.bio = values.bio.trim();
    if (Object.keys(body).length === 0) return;
    mutation.mutate(body);
  });

  return (
    <Section title="Profile">
      {!me ? (
        <p role="status" className="text-sm text-muted">
          Loading…
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {serverError ? <FormAlert>{serverError}</FormAlert> : null}
          {saved && !isDirty ? <FormAlert tone="success">Saved.</FormAlert> : null}
          <AvatarPicker me={me} />
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted">
              {me.email} {me.emailVerified ? "· confirmed" : "· not confirmed"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Username</p>
            <p className="text-sm text-muted">@{me.username} (can’t be changed)</p>
          </div>
          <TextField
            label="Name"
            autoComplete="name"
            error={errors.displayName?.message}
            {...register("displayName", { onChange: () => setSaved(false) })}
          />
          <div>
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              aria-invalid={errors.bio ? true : undefined}
              aria-describedby="bio-count"
              className={`mt-1 w-full rounded-lg border bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-accent ${
                errors.bio ? "border-danger" : "border-line"
              }`}
              {...register("bio", { onChange: () => setSaved(false) })}
            />
            <p id="bio-count" className={`mt-1 text-xs ${bioLength > LIMITS.bio ? "text-danger" : "text-muted"}`}>
              {errors.bio?.message ?? `${bioLength}/${LIMITS.bio}`}
            </p>
          </div>
          <Button type="submit" disabled={!isDirty || mutation.isPending || cooldown.remaining > 0}>
            {mutation.isPending ? "Saving…" : cooldown.remaining > 0 ? `Wait ${cooldown.remaining}s` : "Save changes"}
          </Button>
        </form>
      )}
    </Section>
  );
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function AppearanceSection() {
  const { mode, setMode } = useTheme();
  return (
    <Section title="Appearance">
      <fieldset>
        <legend className="sr-only">Theme</legend>
        <div className="flex flex-col gap-1">
          {themeOptions.map((o) => (
            <label key={o.value} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="radio"
                name="theme"
                value={o.value}
                checked={mode === o.value}
                onChange={() => setMode(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}

function SessionSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endSession() {
    try {
      await logout();
    } catch {
      /* the server always accepts logout; end the session here even if the call fails */
    }
    signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  const everywhere = useMutation({
    mutationFn: logoutAll,
    onSuccess: async () => {
      setConfirming(false);
      await endSession();
    },
    onError: (e) => setError(describeError(e)),
  });

  return (
    <Section title="Sessions">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={() => void endSession()}>
          Log out
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Log out everywhere
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        “Log out everywhere” ends your sessions on every device, including this one. Use it if you lost a phone or
        signed in on a shared computer.
      </p>
      {confirming ? (
        <ConfirmDialog
          title="Log out everywhere?"
          message="You’ll be logged out on all devices, including this one."
          confirmLabel="Log out everywhere"
          busy={everywhere.isPending}
          error={error}
          onConfirm={() => everywhere.mutate()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </Section>
  );
}
