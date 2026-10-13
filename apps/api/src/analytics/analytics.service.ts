import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ANALYTICS_ACTIVE_JOB_STATUSES,
  countActiveCustomers,
  countJobsByStatuses,
  countJobsGroupedByStatus,
  countNewCustomers,
  countOpenServiceRequests,
  countOutstandingInvoices,
  countRepeatCustomers,
  countServiceRequests,
  countSucceededPayments,
  countDistinctCustomersWithJobs,
  listCustomerActivity,
  listRevenueTrends,
  listTechnicianWorkload,
  sumInvoicedAmounts,
  sumOutstandingBalances,
  sumSucceededPayments,
  type AnalyticsDateRange,
  type RevenueTrendPeriod,
} from '../db/queries/index.js';
import { findActiveMembership } from '../db/queries/index.js';
import { findOrganizationCurrency } from '../db/queries/index.js';
import type { OrganizationMemberRole } from '../db/schema/organization.js';
import type {
  AnalyticsCustomersQueryDto,
  AnalyticsDateRangeQueryDto,
  AnalyticsJobsQueryDto,
  AnalyticsOverviewQueryDto,
  AnalyticsRevenueQueryDto,
  AnalyticsTechniciansQueryDto,
} from './dto/analytics-query.dto.js';

const ANALYTICS_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

function isAnalyticsManager(role: string): boolean {
  return (ANALYTICS_MANAGER_ROLES as readonly string[]).includes(role);
}

function toRange(query: AnalyticsDateRangeQueryDto): AnalyticsDateRange {
  const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
  const toDate = query.toDate ? new Date(query.toDate) : undefined;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'fromDate must be a valid ISO date string',
      error: 'Bad Request',
    });
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'toDate must be a valid ISO date string',
      error: 'Bad Request',
    });
  }
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'fromDate must be before or equal to toDate',
      error: 'Bad Request',
    });
  }

  return { fromDate, toDate };
}

function rangeDto(range: AnalyticsDateRange) {
  return {
    fromDate: range.fromDate?.toISOString() ?? null,
    toDate: range.toDate?.toISOString() ?? null,
  };
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

@Injectable()
export class AnalyticsService {
  async overview(
    actorUserId: string,
    organizationId: string,
    query: AnalyticsOverviewQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const range = toRange(query);

    const [
      totalCustomers,
      openRequests,
      activeJobs,
      completedJobs,
      outstandingInvoices,
      revenueCollected,
      invoicedAmount,
      outstandingBalance,
      currency,
    ] = await Promise.all([
      countActiveCustomers(organizationId),
      countOpenServiceRequests(organizationId),
      countJobsByStatuses(organizationId, ANALYTICS_ACTIVE_JOB_STATUSES),
      countJobsByStatuses(organizationId, ['COMPLETED'], range, {
        useCompletedAt: true,
      }),
      countOutstandingInvoices(organizationId),
      sumSucceededPayments(organizationId, range),
      sumInvoicedAmounts(organizationId, range),
      sumOutstandingBalances(organizationId),
      findOrganizationCurrency(organizationId),
    ]);

    return {
      overview: {
        totalCustomers,
        openRequests,
        activeJobs,
        completedJobs,
        outstandingInvoices,
        revenueCollected,
        invoicedAmount,
        outstandingBalance,
        currency: currency ?? null,
        range: rangeDto(range),
      },
    };
  }

  async jobs(
    actorUserId: string,
    organizationId: string,
    query: AnalyticsJobsQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const range = toRange(query);

    const byStatus = await countJobsGroupedByStatus(organizationId, range);
    const total = byStatus.reduce((sum, row) => sum + row.count, 0);
    const completed =
      byStatus.find((row) => row.status === 'COMPLETED')?.count ?? 0;
    const cancelled =
      byStatus.find((row) => row.status === 'CANCELLED')?.count ?? 0;
    const finished = completed + cancelled;

    return {
      jobs: {
        byStatus,
        total,
        completed,
        cancelled,
        /** Among finished jobs (completed + cancelled). Zero when none finished. */
        completionRate: rate(completed, finished),
        cancellationRate: rate(cancelled, finished),
        range: rangeDto(range),
      },
    };
  }

  async revenue(
    actorUserId: string,
    organizationId: string,
    query: AnalyticsRevenueQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const range = toRange(query);
    const period = (query.period ?? 'day') as RevenueTrendPeriod;

    const [
      paymentsReceived,
      paymentCount,
      outstandingBalance,
      invoicedAmount,
      trends,
      currency,
    ] = await Promise.all([
      sumSucceededPayments(organizationId, range),
      countSucceededPayments(organizationId, range),
      sumOutstandingBalances(organizationId),
      sumInvoicedAmounts(organizationId, range),
      listRevenueTrends(organizationId, period, range),
      findOrganizationCurrency(organizationId),
    ]);

    return {
      revenue: {
        paymentsReceived,
        paymentCount,
        outstandingBalance,
        invoicedAmount,
        period,
        trends,
        currency: currency ?? null,
        range: rangeDto(range),
      },
    };
  }

  async technicians(
    actorUserId: string,
    organizationId: string,
    query: AnalyticsTechniciansQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const range = toRange(query);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const { rows, total } = await listTechnicianWorkload(
      organizationId,
      range,
      { limit, offset },
    );

    return {
      technicians: {
        technicians: rows,
        total,
        limit,
        offset,
        range: rangeDto(range),
      },
    };
  }

  async customers(
    actorUserId: string,
    organizationId: string,
    query: AnalyticsCustomersQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const range = toRange(query);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [
      newCustomers,
      repeatCustomers,
      serviceRequestCount,
      customersWithCompletedJobs,
      page,
    ] = await Promise.all([
      countNewCustomers(organizationId, range),
      countRepeatCustomers(organizationId, range),
      countServiceRequests(organizationId, range),
      countDistinctCustomersWithJobs(organizationId, range),
      listCustomerActivity(organizationId, range, { limit, offset }),
    ]);

    return {
      customers: {
        newCustomers,
        repeatCustomers,
        serviceRequestCount,
        customersWithCompletedJobs,
        customers: page.rows,
        total: page.total,
        limit,
        offset,
        range: rangeDto(range),
      },
    };
  }

  private async requireManager(organizationId: string, userId: string) {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    if (!isAnalyticsManager(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can view organization analytics',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
