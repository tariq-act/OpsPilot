import type { Metadata } from "next";
import { Suspense } from "react";

import { AutomationList } from "@/components/automation/automation-list";

export const metadata: Metadata = {
  title: "Automation",
};

export default function AutomationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <AutomationList />
    </Suspense>
  );
}
