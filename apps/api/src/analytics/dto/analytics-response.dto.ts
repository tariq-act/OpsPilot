export class AnalyticsDateRangeDto {
  fromDate!: string | null;
  toDate!: string | null;
}

export class AnalyticsOverviewDto {
  totalCustomers!: number;
  openRequests!: number;
  activeJobs!: number;
  completedJobs!: number;
  outstandingInvoices!: number;
  revenueCollected!: string;
  invoicedAmount!: string;
  outstandingBalance!: string;
  currency!: string | null;
  range!: AnalyticsDateRangeDto;
}

export class AnalyticsOverviewResponseDto {
  overview!: AnalyticsOverviewDto;
}

export class JobStatusCountDto {
  status!: string;
  count!: number;
}

export class AnalyticsJobsDto {
  byStatus!: JobStatusCountDto[];
  total!: number;
  completed!: number;
  cancelled!: number;
  completionRate!: number;
  cancellationRate!: number;
  range!: AnalyticsDateRangeDto;
}

export class AnalyticsJobsResponseDto {
  jobs!: AnalyticsJobsDto;
}

export class RevenueTrendPointDto {
  periodStart!: string;
  amount!: string;
  paymentCount!: number;
}

export class AnalyticsRevenueDto {
  paymentsReceived!: string;
  paymentCount!: number;
  outstandingBalance!: string;
  invoicedAmount!: string;
  period!: 'day' | 'week' | 'month';
  trends!: RevenueTrendPointDto[];
  currency!: string | null;
  range!: AnalyticsDateRangeDto;
}

export class AnalyticsRevenueResponseDto {
  revenue!: AnalyticsRevenueDto;
}

export class TechnicianWorkloadDto {
  technicianId!: string;
  employeeCode!: string;
  status!: string;
  userId!: string;
  assignedJobs!: number;
  completedJobs!: number;
  activeJobs!: number;
}

export class AnalyticsTechniciansDto {
  technicians!: TechnicianWorkloadDto[];
  total!: number;
  limit!: number;
  offset!: number;
  range!: AnalyticsDateRangeDto;
}

export class AnalyticsTechniciansResponseDto {
  technicians!: AnalyticsTechniciansDto;
}

export class CustomerActivityDto {
  customerId!: string;
  name!: string;
  status!: string;
  serviceRequestCount!: number;
  completedJobCount!: number;
  createdAt!: Date;
}

export class AnalyticsCustomersDto {
  newCustomers!: number;
  repeatCustomers!: number;
  serviceRequestCount!: number;
  customersWithCompletedJobs!: number;
  customers!: CustomerActivityDto[];
  total!: number;
  limit!: number;
  offset!: number;
  range!: AnalyticsDateRangeDto;
}

export class AnalyticsCustomersResponseDto {
  customers!: AnalyticsCustomersDto;
}
