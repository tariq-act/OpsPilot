"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmAction,
  Feedback,
  ManagerSettings,
  SettingsCard,
} from "./settings-shell";
import {
  useInvitationsQuery,
  useOrganizationMembersQuery,
  useTeamMutations,
} from "@/lib/query/organizations";
import { toUserErrorMessage } from "@/lib/query/errors";
import type { TeamRole } from "@/lib/api/organizations";
import type { OrganizationListItem } from "@/lib/types";

const roles: TeamRole[] = ["ADMIN", "DISPATCHER", "TECHNICIAN"];
const roleNames = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  TECHNICIAN: "Technician",
};
const selectClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm";
type Action =
  | { kind: "role"; id: string; name: string; role: TeamRole }
  | { kind: "status"; id: string; name: string; status: "ACTIVE" | "SUSPENDED" }
  | { kind: "remove" | "revoke"; id: string; name: string };

export function TeamSettings() {
  return (
    <ManagerSettings>
      {(org) => <Team key={org.id} org={org} />}
    </ManagerSettings>
  );
}

function Team({ org }: { org: OrganizationListItem }) {
  const members = useOrganizationMembersQuery(org.id);
  const invitations = useInvitationsQuery(org.id);
  const mutations = useTeamMutations(org.id);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("TECHNICIAN");
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbackScope, setFeedbackScope] = useState<
    "invite" | "members" | "history"
  >("invite");
  const [roleDrafts, setRoleDrafts] = useState<
    Record<string, TeamRole | undefined>
  >({});
  const [action, setAction] = useState<Action | null>(null);
  const busy = Object.values(mutations).some((mutation) => mutation.isPending);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackScope("invite");
    setError(null);
    setSuccess(null);
    setInviteLink("");
    try {
      const result = await mutations.invite.mutateAsync({
        email: email.trim(),
        role,
      });
      const url = new URL("/invitations/accept", window.location.origin);
      url.searchParams.set("token", result.invitation.token);
      setInviteLink(url.toString());
      mutations.invite.reset();
      setEmail("");
      setSuccess(
        "Invitation created. Share the private link with the invitee.",
      );
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to create invitation."));
    }
  }

  async function confirm() {
    if (!action) return;
    setFeedbackScope(action.kind === "revoke" ? "history" : "members");
    setError(null);
    setSuccess(null);
    try {
      if (action.kind === "role") {
        await mutations.update.mutateAsync({
          memberId: action.id,
          role: action.role,
        });
        setRoleDrafts((drafts) => {
          const next = { ...drafts };
          delete next[action.id];
          return next;
        });
      } else if (action.kind === "status")
        await mutations.update.mutateAsync({
          memberId: action.id,
          status: action.status,
        });
      else if (action.kind === "remove")
        await mutations.remove.mutateAsync(action.id);
      else {
        await mutations.revoke.mutateAsync(action.id);
        setInviteLink("");
      }
      setSuccess(
        action.kind === "revoke"
          ? "Invitation revoked."
          : action.kind === "role"
            ? `${action.name}'s role updated to ${roleNames[action.role]}.`
            : "Team membership updated.",
      );
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to complete the action."));
    } finally {
      setAction(null);
    }
  }

  async function copyLink() {
    setFeedbackScope("invite");
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSuccess("Invitation link copied.");
      setError(null);
    } catch {
      setError(
        "Unable to copy automatically. Select the link and copy it manually.",
      );
    }
  }

  const actionTitle =
    action?.kind === "role"
      ? "Change member role?"
      : action?.kind === "status"
        ? action.status === "ACTIVE"
          ? "Reactivate member?"
          : "Suspend member?"
        : action?.kind === "remove"
          ? "Remove member?"
          : "Revoke invitation?";
  const actionDescription =
    action?.kind === "role"
      ? `Change ${action.name}'s role to ${roleNames[action.role]}.`
      : action?.kind === "status"
        ? `${action.name} will ${action.status === "ACTIVE" ? "regain" : "lose"} access to this organization.`
        : action?.kind === "remove"
          ? `${action.name} will lose access to this organization. Their account and historical activity will remain.`
          : `The invitation for ${action?.name} will no longer be usable.`;

  return (
    <div className="flex flex-col gap-6">
      <SettingsCard
        title="Invite a teammate"
        description="Create a seven-day invitation and share its private link directly with the invitee. Email delivery is not configured."
      >
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className={selectClass}
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              disabled={busy}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleNames[r]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={busy}>
            {mutations.invite.isPending ? "Creating…" : "Create invitation"}
          </Button>
        </form>
        {inviteLink && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="invite-link">Private invitation link</Label>
              <Input
                id="invite-link"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <Button variant="outline" onClick={() => void copyLink()}>
              Copy link
            </Button>
            <Button variant="ghost" onClick={() => setInviteLink("")}>
              Dismiss
            </Button>
          </div>
        )}
      </SettingsCard>
      {feedbackScope === "invite" && (
        <Feedback error={error} success={success} />
      )}
      <SettingsCard
        title="Members"
        description="Select a role and click Save role to apply changes. The owner and your own membership cannot be modified."
      >
        {feedbackScope === "members" && (error || success) && (
          <div className="mb-4">
            <Feedback error={error} success={success} />
          </div>
        )}
        {members.isPending ? (
          <p role="status">Loading members…</p>
        ) : members.isError ? (
          <div>
            <Feedback
              error={toUserErrorMessage(
                members.error,
                "Unable to load members.",
              )}
            />
            <Button variant="outline" onClick={() => void members.refetch()}>
              Retry
            </Button>
          </div>
        ) : !members.members.length ? (
          <p className="text-muted-foreground">No team members yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.members.map((member) => {
                const editable =
                  member.role !== "OWNER" && member.id !== org.membershipId;
                const draftRole = roleDrafts[member.id];
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="font-medium">
                        {member.userName}
                        {member.id === org.membershipId ? " (you)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.userEmail}
                      </p>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Role for ${member.userName}`}
                            className={selectClass}
                            disabled={busy}
                            value={draftRole ?? member.role}
                            onChange={(e) => {
                              const selectedRole = e.target.value as TeamRole;
                              setRoleDrafts((drafts) => ({
                                ...drafts,
                                [member.id]:
                                  selectedRole === member.role
                                    ? undefined
                                    : selectedRole,
                              }));
                            }}
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {roleNames[r]}
                              </option>
                            ))}
                          </select>
                          {draftRole && draftRole !== member.role && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              aria-label={`Save role for ${member.userName}`}
                              onClick={() =>
                                setAction({
                                  kind: "role",
                                  id: member.id,
                                  name: member.userName,
                                  role: draftRole,
                                })
                              }
                            >
                              Save role
                            </Button>
                          )}
                        </div>
                      ) : (
                        roleNames[member.role]
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <div className="flex gap-2">
                          {member.status !== "INVITED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setAction({
                                  kind: "status",
                                  id: member.id,
                                  name: member.userName,
                                  status:
                                    member.status === "SUSPENDED"
                                      ? "ACTIVE"
                                      : "SUSPENDED",
                                })
                              }
                            >
                              {member.status === "SUSPENDED"
                                ? "Reactivate"
                                : "Suspend"}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                kind: "remove",
                                id: member.id,
                                name: member.userName,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SettingsCard>
      <SettingsCard
        title="Invitations"
        description="Review invitation history and revoke unused invitations. Accepted invitations show the member's current role."
      >
        {feedbackScope === "history" && (error || success) && (
          <div className="mb-4">
            <Feedback error={error} success={success} />
          </div>
        )}
        {invitations.isPending ? (
          <p role="status">Loading invitations…</p>
        ) : invitations.isError ? (
          <div>
            <Feedback
              error={toUserErrorMessage(
                invitations.error,
                "Unable to load invitations.",
              )}
            />
            <Button
              variant="outline"
              onClick={() => void invitations.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !invitations.data?.invitations.length ? (
          <p className="text-muted-foreground">No invitations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.data.invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    {invitation.status === "ACCEPTED" ? (
                      invitation.currentRole ? (
                        <>
                          <p>{roleNames[invitation.currentRole]}</p>
                          {invitation.currentRole !== invitation.role && (
                            <p className="text-xs text-muted-foreground">
                              Invited as {roleNames[invitation.role]}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground">
                            No current membership
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invited as {roleNames[invitation.role]}
                          </p>
                        </>
                      )
                    ) : (
                      roleNames[invitation.role]
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{invitation.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {invitation.status === "PENDING" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          setAction({
                            kind: "revoke",
                            id: invitation.id,
                            name: invitation.email,
                          })
                        }
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingsCard>
      {action && (
        <ConfirmAction
          title={actionTitle}
          description={actionDescription}
          pending={busy}
          destructive={action.kind !== "role"}
          onCancel={() => setAction(null)}
          onConfirm={() => void confirm()}
        />
      )}
    </div>
  );
}
