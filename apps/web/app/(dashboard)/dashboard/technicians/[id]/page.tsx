import type { Metadata } from "next";

import { TechnicianDetail } from "@/components/technicians/technician-detail";

export const metadata: Metadata = {
  title: "Technician",
};

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TechnicianDetail id={id} />;
}
