import type { Metadata } from "next";
import { Suspense } from "react";

import { AuditLogList } from "@/components/audit-logs/audit-log-list";

export const metadata: Metadata = {
  title: "Audit Logs",
};

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <AuditLogList />
    </Suspense>
  );
}
