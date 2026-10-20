import type { Metadata } from "next";

import { FollowUpDetail } from "@/components/follow-ups/follow-up-detail";

export const metadata: Metadata = {
  title: "Follow-up",
};

export default async function FollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FollowUpDetail id={id} />;
}
