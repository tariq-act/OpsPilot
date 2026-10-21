"use client";

import Link from "next/link";

import {
  FollowUpStatusBadge,
  FollowUpTypeBadge,
} from "@/components/follow-ups/follow-up-badges";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { isFollowUpManagerRole } from "@/lib/member-roles";
import { useFollowUpsQuery } from "@/lib/query/follow-ups";
import type { MemberRole } from "@/lib/types";

type RelatedFollowUpsProps = {
  organizationId: string;
  role: MemberRole | null | undefined;
  timeZone: string;
  customerId?: string;
  jobId?: string;
  title?: string;
  createHref?: string;
};

export function RelatedFollowUps({
  organizationId,
  role,
  timeZone,
  customerId,
  jobId,
  title = "Follow-ups",
  createHref,
}: RelatedFollowUpsProps) {
  const canManage = isFollowUpManagerRole(role);
  const followUpsQuery = useFollowUpsQuery(organizationId, {
    customerId,
    jobId,
  });

  const defaultCreateHref =
    createHref ??
    `/dashboard/follow-ups?${new URLSearchParams({
      create: "1",
      ...(customerId ? { customerId } : {}),
      ...(jobId ? { jobId } : {}),
    }).toString()}`;

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Follow-ups are available to owners, admins, and dispatchers.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              customerId || jobId
                ? `/dashboard/follow-ups?${new URLSearchParams({
                    ...(customerId ? { customerId } : {}),
                    ...(jobId ? { jobId } : {}),
                  }).toString()}`
                : "/dashboard/follow-ups"
            }
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View all
          </Link>
          <Link
            href={defaultCreateHref}
            className={buttonVariants({ size: "sm" })}
          >
            Create follow-up
          </Link>
        </div>
      </div>

      {followUpsQuery.server.isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
      ) : followUpsQuery.server.isError ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-destructive">
            {followUpsQuery.server.error?.message ??
              "Unable to load follow-ups."}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void followUpsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : followUpsQuery.followUps.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No follow-ups yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {followUpsQuery.followUps.map((followUp) => (
            <li
              key={followUp.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <Link
                  href={`/dashboard/follow-ups/${followUp.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  Due {formatDate(followUp.dueAt, timeZone)}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <FollowUpTypeBadge type={followUp.type} />
                  {followUp.notes ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {followUp.notes}
                    </p>
                  ) : null}
                </div>
              </div>
              <FollowUpStatusBadge status={followUp.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
