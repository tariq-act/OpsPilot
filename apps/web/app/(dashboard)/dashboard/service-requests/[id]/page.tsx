import type { Metadata } from "next";

import { ServiceRequestDetail } from "@/components/service-requests/service-request-detail";

export const metadata: Metadata = {
  title: "Service Request",
};

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceRequestDetail id={id} />;
}
