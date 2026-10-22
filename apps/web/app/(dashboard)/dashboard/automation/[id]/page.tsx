import type { Metadata } from "next";

import { AutomationDetail } from "@/components/automation/automation-detail";

export const metadata: Metadata = {
  title: "Automation rule",
};

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AutomationDetail id={id} />;
}
