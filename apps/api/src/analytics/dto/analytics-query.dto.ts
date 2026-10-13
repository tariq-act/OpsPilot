import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

export const REVENUE_TREND_PERIODS = ['day', 'week', 'month'] as const;

@ValidatorConstraint({ name: 'analyticsDateRangeOrder', async: false })
export class AnalyticsDateRangeOrderConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as { fromDate?: string; toDate?: string };
    if (!dto.fromDate || !dto.toDate) return true;
    return new Date(dto.fromDate).getTime() <= new Date(dto.toDate).getTime();
  }

  defaultMessage(): string {
    return 'fromDate must be before or equal to toDate';
  }
}

export class AnalyticsDateRangeQueryDto {
  @Validate(AnalyticsDateRangeOrderConstraint)
  @IsOptional()
  @IsDateString({}, { message: 'fromDate must be a valid ISO date string' })
  fromDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'toDate must be a valid ISO date string' })
  toDate?: string;
}

export class AnalyticsPageQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be a whole number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset must be a whole number' })
  @Min(0, { message: 'offset must be at least 0' })
  @Max(10000, { message: 'offset must be at most 10000' })
  offset?: number;
}

export class AnalyticsRevenueQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @IsIn(REVENUE_TREND_PERIODS, {
    message: 'period must be day, week, or month',
  })
  period?: (typeof REVENUE_TREND_PERIODS)[number];
}

export class AnalyticsOverviewQueryDto extends AnalyticsDateRangeQueryDto {}

export class AnalyticsJobsQueryDto extends AnalyticsDateRangeQueryDto {}

export class AnalyticsTechniciansQueryDto extends AnalyticsPageQueryDto {}

export class AnalyticsCustomersQueryDto extends AnalyticsPageQueryDto {}
