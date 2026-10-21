import type { Metadata } from "next";
import { Suspense } from "react";

import { FollowUpList } from "@/components/follow-ups/follow-up-list";

export const metadata: Metadata = {
  title: "Follow-ups",
};

export default function FollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <FollowUpList />
    </Suspense>
  );
}
