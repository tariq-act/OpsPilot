"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { OrganizationListItem } from "@/lib/types";

export function canManageOrganization(org: OrganizationListItem | null) {
  return (
    org?.membershipStatus === "ACTIVE" &&
    (org.role === "OWNER" || org.role === "ADMIN")
  );
}

const base = "/dashboard/settings";
const links = [
  { label: "General", href: `${base}/general`, manager: true },
  { label: "Team", href: `${base}/team`, manager: true },
  {
    label: "Business Preferences",
    href: `${base}/business-preferences`,
    manager: true,
  },
  { label: "My Profile", href: `${base}/profile`, manager: false },
  { label: "Security", href: `${base}/security`, manager: false },
];

export function SettingsShell({ children }: { children: ReactNode }) {
  const { current } = useOrg();
  const pathname = usePathname();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your organization and personal account."
      />
      <nav
        aria-label="Settings"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {links
          .filter((link) => !link.manager || canManageOrganization(current))
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
      </nav>
      {children}
    </div>
  );
}

export function ManagerSettings({
  children,
}: {
  children: (org: OrganizationListItem) => ReactNode;
}) {
  const { current, loading, error, refresh } = useOrg();
  if (loading) return <p role="status">Loading organization…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <Button variant="outline" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  if (!current || !canManageOrganization(current))
    return (
      <SettingsCard
        title="Access restricted"
        description="Only active organization owners and admins can manage organization settings."
      >
        <Link href={`${base}/profile`} className="text-primary underline">
          Go to My Profile
        </Link>
      </SettingsCard>
    );
  return children(current);
}

export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Feedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg bg-success/10 p-3 text-sm text-success"
        >
          {success}
        </p>
      )}
    </>
  );
}

export function ConfirmAction({
  title,
  description,
  pending,
  onCancel,
  onConfirm,
  destructive = false,
}: {
  title: string;
  description: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
