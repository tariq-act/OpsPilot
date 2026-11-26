"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/org-provider";
import { canManageOrganization } from "@/components/settings/settings-shell";

export default function SettingsPage() {
  const { current, loading } = useOrg();
  const router = useRouter();
  useEffect(() => {
    if (!loading)
      router.replace(
        canManageOrganization(current)
          ? "/dashboard/settings/general"
          : "/dashboard/settings/profile",
      );
  }, [current, loading, router]);
  return <p role="status">Loading settings…</p>;
}
