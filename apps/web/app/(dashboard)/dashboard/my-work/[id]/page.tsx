import type { Metadata } from "next";

import { JobExecution } from "@/components/work/job-execution";

export const metadata: Metadata = {
  title: "Job execution",
};

export default async function MyWorkJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobExecution id={id} />;
}
