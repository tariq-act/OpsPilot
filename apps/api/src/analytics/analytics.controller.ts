import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from '../common/organization-id.decorator.js';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { AnalyticsService } from './analytics.service.js';
import {
  AnalyticsCustomersQueryDto,
  AnalyticsJobsQueryDto,
  AnalyticsOverviewQueryDto,
  AnalyticsRevenueQueryDto,
  AnalyticsTechniciansQueryDto,
} from './dto/analytics-query.dto.js';
import {
  AnalyticsCustomersResponseDto,
  AnalyticsJobsResponseDto,
  AnalyticsOverviewResponseDto,
  AnalyticsRevenueResponseDto,
  AnalyticsTechniciansResponseDto,
} from './dto/analytics-response.dto.js';

// Swagger docs START
@ApiTags('Analytics')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
// Swagger docs END
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  // Swagger docs START
  @ApiOperation({
    summary: 'Organization analytics overview',
    description:
      'Owners, admins, and dispatchers see headline counts. Revenue collected is the sum of SUCCEEDED payments. Outstanding balance is the sum of amountDue on open invoices. Invoiced amount is non-draft, non-void invoice totals.',
  })
  @ApiOkResponse({ type: AnalyticsOverviewResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async overview(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: AnalyticsOverviewQueryDto,
  ): Promise<AnalyticsOverviewResponseDto> {
    return this.analyticsService.overview(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get('jobs')
  // Swagger docs START
  @ApiOperation({
    summary: 'Job analytics',
    description:
      'Counts by status, completion rate, and cancellation rate. Optional fromDate and toDate filter on job createdAt.',
  })
  @ApiOkResponse({ type: AnalyticsJobsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async jobs(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: AnalyticsJobsQueryDto,
  ): Promise<AnalyticsJobsResponseDto> {
    return this.analyticsService.jobs(session.user.id, organizationId, query);
  }

  @Get('revenue')
  // Swagger docs START
  @ApiOperation({
    summary: 'Revenue analytics',
    description:
      'Payments received from SUCCEEDED payment rows, current outstanding balances, invoiced amounts, and trends by day, week, or month.',
  })
  @ApiOkResponse({ type: AnalyticsRevenueResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async revenue(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: AnalyticsRevenueQueryDto,
  ): Promise<AnalyticsRevenueResponseDto> {
    return this.analyticsService.revenue(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get('technicians')
  // Swagger docs START
  @ApiOperation({
    summary: 'Technician workload analytics',
    description:
      'Assigned, completed, and active job counts per technician. Paginated with limit and offset.',
  })
  @ApiOkResponse({ type: AnalyticsTechniciansResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async technicians(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: AnalyticsTechniciansQueryDto,
  ): Promise<AnalyticsTechniciansResponseDto> {
    return this.analyticsService.technicians(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get('customers')
  // Swagger docs START
  @ApiOperation({
    summary: 'Customer analytics',
    description:
      'New customers, repeat customers (two or more completed jobs), service-request counts, and a paginated customer activity list.',
  })
  @ApiOkResponse({ type: AnalyticsCustomersResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async customers(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: AnalyticsCustomersQueryDto,
  ): Promise<AnalyticsCustomersResponseDto> {
    return this.analyticsService.customers(
      session.user.id,
      organizationId,
      query,
    );
  }
}
