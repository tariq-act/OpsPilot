import type { Metadata } from "next";
import { Suspense } from "react";

import { DispatchBoard } from "@/components/dispatch/dispatch-board";

export const metadata: Metadata = {
  title: "Scheduling & Dispatch",
};

export default function DispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <DispatchBoard />
    </Suspense>
  );
}
