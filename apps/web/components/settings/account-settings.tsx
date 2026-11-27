"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction, Feedback, SettingsCard } from "./settings-shell";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query/keys";

export function ProfileSettings() {
  const session = authClient.useSession();
  if (session.isPending) return <p role="status">Loading profile…</p>;
  if (!session.data?.user)
    return (
      <Feedback error="Unable to load your profile. Sign in again and retry." />
    );
  return <ProfileForm key={session.data.user.id} user={session.data.user} />;
}

function ProfileForm({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
  };
}) {
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const normalized = name.trim();
      if (!normalized || normalized.length > 100)
        throw new Error("Enter a name between 1 and 100 characters.");
      if (image.trim()) {
        try {
          if (new URL(image.trim()).protocol !== "https:") throw new Error();
        } catch {
          throw new Error("Profile image must be an HTTPS URL.");
        }
      }
      const result = await authClient.updateUser({
        name: normalized,
        image: image.trim() || null,
      });
      if (result.error)
        throw new Error(
          result.error.message ?? "Unable to update your profile.",
        );
    },
    onSuccess: async () => {
      setName(name.trim());
      setImage(image.trim());
      await client.invalidateQueries({ queryKey: queryKeys.organizations.all });
      setNotice("Profile saved.");
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    mutation.mutate();
  }
  return (
    <SettingsCard
      title="My Profile"
      description="Your profile is shared across all organizations you belong to."
    >
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            value={name}
            required
            maxLength={100}
            disabled={mutation.isPending}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email address</Label>
          <Input id="profile-email" value={user.email} readOnly />
          <p className="text-xs text-muted-foreground">
            {user.emailVerified ? "Verified" : "Not verified"}. Email changes
            require a configured verification flow.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-image">Profile image URL (HTTPS)</Label>
          <Input
            id="profile-image"
            type="url"
            value={image}
            maxLength={2048}
            disabled={mutation.isPending}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>
        <Feedback error={mutation.error?.message} success={notice} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </SettingsCard>
  );
}

export function SecuritySettings() {
  const session = authClient.useSession();
  if (session.isPending) return <p role="status">Loading security settings…</p>;
  if (!session.data?.user)
    return (
      <Feedback error="Unable to load your account. Sign in again and retry." />
    );
  return (
    <SecurityForm
      key={session.data.user.id}
      userId={session.data.user.id}
      currentSessionId={session.data.session.id}
    />
  );
}

function SecurityForm({
  userId,
  currentSessionId,
}: {
  userId: string;
  currentSessionId: string;
}) {
  const client = useQueryClient();
  const sessionsKey = queryKeys.account.sessions(userId);
  const sessions = useQuery({
    queryKey: sessionsKey,
    gcTime: 0,
    queryFn: async () => {
      const result = await authClient.listSessions();
      if (result.error)
        throw new Error(result.error.message ?? "Unable to load sessions.");
      // Keep only display metadata in the client query cache.
      return result.data.map(({ id, userAgent, expiresAt }) => ({
        id,
        userAgent,
        expiresAt,
      }));
    },
  });
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [action, setAction] = useState<"password" | "sessions" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (kind: "password" | "sessions") => {
      const result =
        kind === "password"
          ? await authClient.changePassword({
              currentPassword: current,
              newPassword: password,
              revokeOtherSessions: true,
            })
          : await authClient.revokeOtherSessions();
      if (result.error)
        throw new Error(
          result.error.message ?? "Unable to update security settings.",
        );
    },
    onSuccess: async (_, kind) => {
      if (kind === "password") {
        setCurrent("");
        setPassword("");
        setConfirmation("");
      }
      setSuccess(
        kind === "password"
          ? "Password changed. Other sessions have been signed out."
          : "Other sessions signed out.",
      );
      await client.invalidateQueries({ queryKey: sessionsKey });
    },
    onError: (err) => setError(err.message),
    onSettled: () => setAction(null),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (current === password) {
      setError("Choose a different password.");
      return;
    }
    setAction("password");
  }
  return (
    <div className="space-y-6">
      <Feedback error={error} success={success} />
      <SettingsCard
        title="Change password"
        description="Changing your password signs out other sessions. Your current session remains active."
      >
        <form onSubmit={submit} className="max-w-xl space-y-4">
          <PasswordField
            id="current-password"
            label="Current password"
            value={current}
            onChange={setCurrent}
            placeholder="Current password"
            autoComplete="current-password"
            required
            disabled={mutation.isPending}
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            disabled={mutation.isPending}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmation}
            onChange={setConfirmation}
            placeholder="Repeat new password"
            autoComplete="new-password"
            required
            disabled={mutation.isPending}
          />
          <Button type="submit" disabled={mutation.isPending}>
            Change password
          </Button>
        </form>
      </SettingsCard>
      <SettingsCard
        title="Active sessions"
        description="Review your active sign-ins and sign out of all other devices."
      >
        {sessions.isPending ? (
          <p role="status">Loading sessions…</p>
        ) : sessions.isError ? (
          <div>
            <Feedback error={sessions.error.message} />
            <Button variant="outline" onClick={() => void sessions.refetch()}>
              Retry
            </Button>
          </div>
        ) : !sessions.data?.length ? (
          <p className="text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-border">
              {sessions.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-all font-medium">
                      {item.userAgent || "Unknown device"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(item.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  {item.id === currentSessionId && (
                    <Badge>Current session</Badge>
                  )}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              disabled={
                mutation.isPending ||
                !sessions.data.some((item) => item.id !== currentSessionId)
              }
              onClick={() => {
                setError(null);
                setSuccess(null);
                setAction("sessions");
              }}
            >
              Sign out other sessions
            </Button>
          </div>
        )}
      </SettingsCard>
      {action && (
        <ConfirmAction
          title={
            action === "password"
              ? "Change password?"
              : "Sign out other sessions?"
          }
          description="Other devices will need to sign in again."
          pending={mutation.isPending}
          onCancel={() => setAction(null)}
          onConfirm={() => mutation.mutate(action)}
          destructive
        />
      )}
    </div>
  );
}
