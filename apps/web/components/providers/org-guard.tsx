"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/org-provider";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/**
 * Waits for the org context to resolve, then redirects users who have no
 * organizations to /onboarding. Renders a skeleton while loading.
 */
export function OrgGuard({ children }: { children: ReactNode }) {
  const { organizations, loading, error } = useOrg();
  const router = useRouter();

  useEffect(() => {
    if (!loading && organizations.length === 0 && !error) {
      router.replace("/onboarding");
    }
  }, [loading, organizations.length, error, router]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-primary hover:text-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) return <PageSkeleton />;

  return <>{children}</>;
}
