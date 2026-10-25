"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  HorizontalBarsChart,
  VerticalBarsChart,
  type BarDatum,
} from "@/components/analytics/analytics-charts";
import { AnalyticsKpi } from "@/components/analytics/analytics-kpi";
import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANALYTICS_RANGE_PRESET_LABEL,
  ANALYTICS_RANGE_PRESETS,
  REVENUE_PERIOD_LABEL,
  REVENUE_PERIODS,
  formatRate,
  rangeFromPreset,
  suggestPeriodForPreset,
  type AnalyticsRangePreset,
} from "@/lib/analytics-range";
import {
  formatDateParam,
  parseDateParam,
  toIsoDateEnd,
  toIsoDateStart,
} from "@/lib/dispatch-date";
import { formatDate, formatMoney } from "@/lib/format";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { isAnalyticsManagerRole } from "@/lib/member-roles";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useAnalyticsCustomersQuery,
  useAnalyticsJobsQuery,
  useAnalyticsOverviewQuery,
  useAnalyticsRevenueQuery,
  useAnalyticsTechniciansQuery,
} from "@/lib/query/analytics";
import type { JobStatus, RevenueTrendPeriod } from "@/lib/types";

const TECH_LIMIT = 10;
const CUSTOMER_LIMIT = 10;

function isRangePreset(value: string | null): value is AnalyticsRangePreset {
  return (
    value !== null &&
    (ANALYTICS_RANGE_PRESETS as readonly string[]).includes(value)
  );
}

function isRevenuePeriod(value: string | null): value is RevenueTrendPeriod {
  return (
    value !== null && (REVENUE_PERIODS as readonly string[]).includes(value)
  );
}

function formatCount(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(undefined).format(value);
}

function jobStatusLabel(status: string): string {
  if (status in JOB_STATUS_LABEL) {
    return JOB_STATUS_LABEL[status as JobStatus];
  }
  return status;
}

export function AnalyticsDashboard() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range");
  const preset: AnalyticsRangePreset = isRangePreset(rangeParam)
    ? rangeParam
    : "month";
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";
  const periodParam = searchParams.get("period");

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const orgCurrency = current?.currency ?? "USD";
  const canView = isAnalyticsManagerRole(current?.role);

  const [customFrom, setCustomFrom] = useState<Date | undefined>(() =>
    parseDateParam(fromDateParam),
  );
  const [customTo, setCustomTo] = useState<Date | undefined>(() =>
    parseDateParam(toDateParam),
  );

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      return {
        fromDate: toIsoDateStart(customFrom ?? parseDateParam(fromDateParam)),
        toDate: toIsoDateEnd(customTo ?? parseDateParam(toDateParam)),
      };
    }
    return rangeFromPreset(preset);
  }, [preset, customFrom, customTo, fromDateParam, toDateParam]);

  const period: RevenueTrendPeriod =
    isRevenuePeriod(periodParam) && periodParam
      ? periodParam
      : suggestPeriodForPreset(preset);

  const rangeQuery = useMemo(
    () => ({
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    }),
    [dateRange.fromDate, dateRange.toDate],
  );

  const revenueQueryParams = useMemo(
    () => ({
      ...rangeQuery,
      period,
    }),
    [rangeQuery, period],
  );

  const pageQuery = useMemo(
    () => ({
      ...rangeQuery,
      limit: TECH_LIMIT,
      offset: 0,
    }),
    [rangeQuery],
  );

  const overviewQuery = useAnalyticsOverviewQuery(
    canView ? organizationId : "",
    rangeQuery,
  );
  const jobsQuery = useAnalyticsJobsQuery(
    canView ? organizationId : "",
    rangeQuery,
  );
  const revenueQuery = useAnalyticsRevenueQuery(
    canView ? organizationId : "",
    revenueQueryParams,
  );
  const techniciansQuery = useAnalyticsTechniciansQuery(
    canView ? organizationId : "",
    pageQuery,
  );
  const customersQuery = useAnalyticsCustomersQuery(
    canView ? organizationId : "",
    pageQuery,
  );

  function updateParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function handlePresetChange(value: string | null) {
    const next = (value ?? "month") as AnalyticsRangePreset;
    if (next === "custom") {
      const fallback = rangeFromPreset("month");
      const from =
        customFrom ??
        (fallback.fromDate ? new Date(fallback.fromDate) : undefined);
      const to =
        customTo ?? (fallback.toDate ? new Date(fallback.toDate) : undefined);
      setCustomFrom(from);
      setCustomTo(to);
      updateParams({
        range: "custom",
        fromDate: formatDateParam(from),
        toDate: formatDateParam(to),
        period: suggestPeriodForPreset("custom"),
      });
      return;
    }
    updateParams({
      range: next,
      fromDate: "",
      toDate: "",
      period: suggestPeriodForPreset(next),
    });
  }

  const currency =
    overviewQuery.overview?.currency ??
    revenueQuery.revenue?.currency ??
    orgCurrency;

  const jobsByStatus: BarDatum[] = useMemo(() => {
    const rows = jobsQuery.jobs?.byStatus ?? [];
    return rows.map((row) => ({
      id: row.status,
      label: jobStatusLabel(row.status),
      value: row.count,
      displayValue: formatCount(row.count) ?? "0",
    }));
  }, [jobsQuery.jobs?.byStatus]);

  const revenueTrend: BarDatum[] = useMemo(() => {
    const rows = revenueQuery.revenue?.trends ?? [];
    return rows.map((row) => {
      const amount = Number(row.amount);
      return {
        id: row.periodStart,
        label: formatDate(row.periodStart, timeZone),
        value: Number.isFinite(amount) ? amount : 0,
        displayValue: formatMoney(row.amount, currency),
      };
    });
  }, [revenueQuery.revenue?.trends, timeZone, currency]);

  const technicianBars: BarDatum[] = useMemo(() => {
    const rows = techniciansQuery.technicians?.technicians ?? [];
    return rows.map((row) => ({
      id: row.technicianId,
      label: row.employeeCode || row.technicianId.slice(0, 8),
      value: row.assignedJobs,
      displayValue: `${formatCount(row.completedJobs) ?? 0} completed · ${formatCount(row.activeJobs) ?? 0} active · ${formatCount(row.assignedJobs) ?? 0} assigned`,
    }));
  }, [techniciansQuery.technicians?.technicians]);

  const customerBars: BarDatum[] = useMemo(() => {
    const rows = customersQuery.customers?.customers ?? [];
    return rows.map((row) => ({
      id: row.customerId,
      label: row.name,
      value: row.serviceRequestCount,
      displayValue: `${formatCount(row.serviceRequestCount) ?? 0} requests · ${formatCount(row.completedJobCount) ?? 0} jobs`,
    }));
  }, [customersQuery.customers?.customers]);

  const rangeLabel = useMemo(() => {
    if (preset === "all") return "All time";
    if (preset === "custom") {
      const from = customFrom ?? parseDateParam(fromDateParam);
      const to = customTo ?? parseDateParam(toDateParam);
      if (!from && !to) return "Custom range";
      const fromText = from
        ? formatDate(toIsoDateStart(from) ?? undefined, timeZone)
        : "…";
      const toText = to
        ? formatDate(toIsoDateEnd(to) ?? undefined, timeZone)
        : "…";
      return `${fromText} – ${toText}`;
    }
    return ANALYTICS_RANGE_PRESET_LABEL[preset];
  }, [preset, customFrom, customTo, fromDateParam, toDateParam, timeZone]);

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analytics" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analytics" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can view organization analytics.
        </p>
      </div>
    );
  }

  const overviewLoading = overviewQuery.server.isLoading;
  const overviewError = overviewQuery.server.isError;
  const jobsLoading = jobsQuery.server.isLoading;
  const jobsError = jobsQuery.server.isError;
  const revenueLoading = revenueQuery.server.isLoading;
  const revenueError = revenueQuery.server.isError;
  const customersLoading = customersQuery.server.isLoading;
  const customersError = customersQuery.server.isError;

  const overview = overviewQuery.overview;
  const jobs = jobsQuery.jobs;
  const revenue = revenueQuery.revenue;
  const customers = customersQuery.customers;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description={`Operational and business performance for ${current.name}.`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void overviewQuery.refetch();
              void jobsQuery.refetch();
              void revenueQuery.refetch();
              void techniciansQuery.refetch();
              void customersQuery.refetch();
            }}
            disabled={
              overviewQuery.server.isFetching ||
              jobsQuery.server.isFetching ||
              revenueQuery.server.isFetching
            }
          >
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="analytics-range">Date range</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger id="analytics-range" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYTICS_RANGE_PRESETS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ANALYTICS_RANGE_PRESET_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="analytics-period">Revenue trend</Label>
            <Select
              value={period}
              onValueChange={(value) =>
                updateParams({ period: value ?? "day" })
              }
            >
              <SelectTrigger id="analytics-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_PERIODS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {REVENUE_PERIOD_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="analytics-from">From</Label>
                <DatePicker
                  id="analytics-from"
                  value={customFrom}
                  onChange={(date) => {
                    setCustomFrom(date);
                    updateParams({
                      range: "custom",
                      fromDate: formatDateParam(date),
                      toDate: formatDateParam(customTo),
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="analytics-to">To</Label>
                <DatePicker
                  id="analytics-to"
                  value={customTo}
                  onChange={(date) => {
                    setCustomTo(date);
                    updateParams({
                      range: "custom",
                      fromDate: formatDateParam(customFrom),
                      toDate: formatDateParam(date),
                    });
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {rangeLabel}
          {preset !== "all" && timeZone ? ` · ${timeZone}` : null}
        </p>
      </div>

      <section aria-labelledby="analytics-ops-heading" className="flex flex-col gap-3">
        <h2
          id="analytics-ops-heading"
          className="text-sm font-semibold text-foreground"
        >
          Operations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <AnalyticsKpi
            label="Open requests"
            value={formatCount(overview?.openRequests)}
            isLoading={overviewLoading}
            isError={overviewError}
          />
          <AnalyticsKpi
            label="Active jobs"
            value={formatCount(overview?.activeJobs)}
            isLoading={overviewLoading}
            isError={overviewError}
          />
          <AnalyticsKpi
            label="Jobs in range"
            value={formatCount(jobs?.total)}
            isLoading={jobsLoading}
            isError={jobsError}
          />
          <AnalyticsKpi
            label="Completed jobs"
            value={formatCount(jobs?.completed ?? overview?.completedJobs)}
            isLoading={jobsLoading && overviewLoading}
            isError={jobsError && overviewError}
          />
          <AnalyticsKpi
            label="Cancelled jobs"
            value={formatCount(jobs?.cancelled)}
            isLoading={jobsLoading}
            isError={jobsError}
          />
          <AnalyticsKpi
            label="Completion rate"
            value={jobs ? formatRate(jobs.completionRate) : null}
            isLoading={jobsLoading}
            isError={jobsError}
            hint="Among finished jobs (completed + cancelled)"
          />
          <AnalyticsKpi
            label="Cancellation rate"
            value={jobs ? formatRate(jobs.cancellationRate) : null}
            isLoading={jobsLoading}
            isError={jobsError}
          />
        </div>
        {overviewError ? (
          <p role="alert" className="text-sm text-destructive">
            {toUserErrorMessage(
              overviewQuery.error,
              "Unable to load overview metrics.",
            )}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:text-primary/80"
              onClick={() => void overviewQuery.refetch()}
            >
              Retry
            </button>
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="analytics-revenue-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="analytics-revenue-heading"
          className="text-sm font-semibold text-foreground"
        >
          Revenue
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsKpi
            label="Invoiced"
            value={
              overview || revenue
                ? formatMoney(
                    overview?.invoicedAmount ?? revenue?.invoicedAmount,
                    currency,
                  )
                : null
            }
            isLoading={overviewLoading && revenueLoading}
            isError={overviewError && revenueError}
          />
          <AnalyticsKpi
            label="Collected"
            value={
              overview || revenue
                ? formatMoney(
                    overview?.revenueCollected ?? revenue?.paymentsReceived,
                    currency,
                  )
                : null
            }
            isLoading={overviewLoading && revenueLoading}
            isError={overviewError && revenueError}
            hint={
              revenue?.paymentCount != null
                ? `${formatCount(revenue.paymentCount)} payments`
                : null
            }
          />
          <AnalyticsKpi
            label="Outstanding balance"
            value={
              overview || revenue
                ? formatMoney(
                    overview?.outstandingBalance ??
                      revenue?.outstandingBalance,
                    currency,
                  )
                : null
            }
            isLoading={overviewLoading && revenueLoading}
            isError={overviewError && revenueError}
          />
          <AnalyticsKpi
            label="Open invoices"
            value={formatCount(overview?.outstandingInvoices)}
            isLoading={overviewLoading}
            isError={overviewError}
          />
        </div>
      </section>

      <section
        aria-labelledby="analytics-customers-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="analytics-customers-heading"
          className="text-sm font-semibold text-foreground"
        >
          Customers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsKpi
            label="Total customers"
            value={formatCount(overview?.totalCustomers)}
            isLoading={overviewLoading}
            isError={overviewError}
            hint="Active customers in the organization"
          />
          <AnalyticsKpi
            label="New customers"
            value={formatCount(customers?.newCustomers)}
            isLoading={customersLoading}
            isError={customersError}
            hint="Created in selected range"
          />
          <AnalyticsKpi
            label="Repeat customers"
            value={formatCount(customers?.repeatCustomers)}
            isLoading={customersLoading}
            isError={customersError}
            hint="Two or more completed jobs"
          />
          <AnalyticsKpi
            label="Service requests"
            value={formatCount(customers?.serviceRequestCount)}
            isLoading={customersLoading}
            isError={customersError}
            hint="In selected range"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBarsChart
          title="Jobs by status"
          description="Job counts in the selected range"
          data={jobsByStatus}
          isLoading={jobsLoading}
          isError={jobsError}
          errorMessage={
            jobsError
              ? toUserErrorMessage(jobsQuery.error, "Unable to load jobs.")
              : null
          }
          onRetry={() => void jobsQuery.refetch()}
          emptyLabel="No jobs in this range."
        />
        <VerticalBarsChart
          title="Payments over time"
          description={`${REVENUE_PERIOD_LABEL[period]} succeeded payments`}
          data={revenueTrend}
          isLoading={revenueLoading}
          isError={revenueError}
          errorMessage={
            revenueError
              ? toUserErrorMessage(
                  revenueQuery.error,
                  "Unable to load revenue trends.",
                )
              : null
          }
          onRetry={() => void revenueQuery.refetch()}
          emptyLabel="No payments in this range."
        />
        <HorizontalBarsChart
          title="Technician workload"
          description="Assigned jobs by technician"
          data={technicianBars}
          isLoading={techniciansQuery.server.isLoading}
          isError={techniciansQuery.server.isError}
          errorMessage={
            techniciansQuery.server.isError
              ? toUserErrorMessage(
                  techniciansQuery.error,
                  "Unable to load technician analytics.",
                )
              : null
          }
          onRetry={() => void techniciansQuery.refetch()}
          emptyLabel="No technician workload in this range."
        />
        <HorizontalBarsChart
          title="Customer activity"
          description="Service requests by customer"
          data={customerBars}
          isLoading={customersLoading}
          isError={customersError}
          errorMessage={
            customersError
              ? toUserErrorMessage(
                  customersQuery.error,
                  "Unable to load customer analytics.",
                )
              : null
          }
          onRetry={() => void customersQuery.refetch()}
          emptyLabel="No customer activity in this range."
        />
      </div>

      {techniciansQuery.technicians &&
      techniciansQuery.technicians.total > TECH_LIMIT ? (
        <p className="text-xs text-muted-foreground">
          Showing top {TECH_LIMIT} of {techniciansQuery.technicians.total}{" "}
          technicians by workload.
        </p>
      ) : null}
      {customersQuery.customers &&
      customersQuery.customers.total > CUSTOMER_LIMIT ? (
        <p className="text-xs text-muted-foreground">
          Showing top {CUSTOMER_LIMIT} of {customersQuery.customers.total}{" "}
          customers by activity.
        </p>
      ) : null}
    </div>
  );
}
