"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LuBell,
  LuBriefcase,
  LuCalendarCheck,
  LuCalendarClock,
  LuChartBar,
  LuClipboardList,
  LuFileText,
  LuHistory,
  LuLogOut,
  LuMenu,
  LuMessageSquare,
  LuUsers,
  LuWorkflow,
  LuWrench,
  LuX,
} from "react-icons/lu";

import { BrandLogo } from "@/components/brand/brand-logo";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Roles that can see this item. Undefined means visible to all roles. */
  roles?: MemberRole[];
}

const navItems: NavItem[] = [
  {
    label: "My Work",
    href: "/dashboard/my-work",
    icon: LuClipboardList,
    roles: ["TECHNICIAN"],
  },
  {
    label: "Jobs",
    href: "/dashboard/jobs",
    icon: LuBriefcase,
  },
  {
    label: "Dispatch",
    href: "/dashboard/dispatch",
    icon: LuCalendarClock,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Service Requests",
    href: "/dashboard/service-requests",
    icon: LuBell,
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: LuUsers,
  },
  {
    label: "Technicians",
    href: "/dashboard/technicians",
    icon: LuWrench,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Invoices",
    href: "/dashboard/invoices",
    icon: LuFileText,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: LuMessageSquare,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Follow-ups",
    href: "/dashboard/follow-ups",
    icon: LuCalendarCheck,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Automation",
    href: "/dashboard/automation",
    icon: LuWorkflow,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: LuChartBar,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: LuHistory,
    roles: ["OWNER", "ADMIN"],
  },
];

function OrgSwitcher() {
  const { organizations, current, switchOrganization } = useOrg();

  if (organizations.length > 1) {
    return (
      <div className="border-b border-border px-3 py-3">
        <label
          htmlFor="org-switcher"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Organization
        </label>
        <select
          id="org-switcher"
          value={current?.id ?? ""}
          onChange={(e) => switchOrganization(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (organizations.length === 1 && current) {
    return (
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">
          Organization
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {current.name}
        </p>
      </div>
    );
  }

  return null;
}

function SidebarNav({
  role,
  onNavigate,
}: {
  role: MemberRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { current } = useOrg();
  const activeRole = current?.role ?? role;

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(activeRole),
  );

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <div className="border-t border-border p-3">
      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <LuLogOut className="size-4 shrink-0" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-1">
        <BrandLogo size={40} priority />
        <span className="text-base font-semibold tracking-tight">OpsPilot</span>
      </div>
      <Badge
        variant="secondary"
        className="ml-auto bg-primary/10 text-primary hover:bg-primary/10"
      >
        EA
      </Badge>
    </div>
  );
}

export function DashboardSidebar({ role }: { role: MemberRole }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background-subtle md:flex">
      <BrandHeader />
      <OrgSwitcher />
      <SidebarNav role={role} />
      <SignOutButton />
    </aside>
  );
}

export function MobileNavTrigger({ role }: { role: MemberRole }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <LuMenu className="size-5" aria-hidden="true" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-background-subtle shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex min-w-0 items-center gap-1">
                <BrandLogo size={36} />
                <span className="text-base font-semibold tracking-tight">
                  OpsPilot
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <LuX className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <OrgSwitcher />
            <SidebarNav role={role} onNavigate={() => setOpen(false)} />
            <SignOutButton />
          </aside>
        </div>
      ) : null}
    </>
  );
}
