import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { OrgProvider } from "@/components/providers/org-provider";
import { OrgGuard } from "@/components/providers/org-guard";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { NotificationsHeaderLink } from "@/components/notifications/notifications-header-link";
import type { MemberRole } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Fetch the active Better Auth session on the server.
 * Returns the user and their active membership role, or null.
 */
async function getServerSession(): Promise<{
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
} | null> {
  try {
    const headersList = await headers();
    const cookie = headersList.get("cookie") ?? "";

    const response = await fetch(`${API_BASE}/api/auth/get-session`, {
      headers: { cookie },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      user?: { id: string; name: string; email: string };
      session?: { userId: string };
    } | null;

    if (!data?.user) return null;

    // The membership role is resolved client-side via OrgContext since it
    // depends on the selected org. We return a safe default here.
    return {
      userId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      // Default to TECHNICIAN (least privilege). OrgProvider will supply
      // the real role once it fetches the org list on the client.
      role: "TECHNICIAN" as MemberRole,
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <OrgProvider>
      <OrgGuard>
        <DashboardShell session={session}>{children}</DashboardShell>
      </OrgGuard>
    </OrgProvider>
  );
}

function DashboardShell({
  session,
  children,
}: {
  session: { role: MemberRole };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={session.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-background px-4 sm:px-6">
          <NotificationsHeaderLink />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
