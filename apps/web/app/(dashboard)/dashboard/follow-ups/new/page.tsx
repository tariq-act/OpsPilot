import { redirect } from "next/navigation";

export default async function NewFollowUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams({ create: "1" });
  for (const key of ["customerId", "jobId"] as const) {
    const value = params[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  redirect(`/dashboard/follow-ups?${next.toString()}`);
}
