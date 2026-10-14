"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LuBell,
  LuBriefcase,
  LuBuilding2,
  LuChartBar,
  LuCompass,
  LuFileText,
  LuLogOut,
  LuSettings,
  LuUsers,
  LuWrench,
} from "react-icons/lu";

import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
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
    label: "Jobs",
    href: "/dashboard/jobs",
    icon: LuBriefcase,
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
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: LuChartBar,
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: LuBuilding2,
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: LuSettings,
    roles: ["OWNER", "ADMIN"],
  },
];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function DashboardSidebar({ role }: { role: MemberRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const { organizations, current, switchOrganization } = useOrg();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background-subtle">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LuCompass className="size-4" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight">OpsPilot</span>
        <Badge
          variant="secondary"
          className="ml-auto bg-primary/10 text-primary hover:bg-primary/10"
        >
          EA
        </Badge>
      </div>

      {/* Organization switcher */}
      {organizations.length > 1 && (
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
      )}

      {/* Single org name */}
      {organizations.length === 1 && current && (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Organization
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {current.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* Sign out */}
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
    </aside>
  );
}
