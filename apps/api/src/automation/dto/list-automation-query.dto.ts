import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  AUTOMATION_EXECUTION_STATUSES,
  AUTOMATION_TRIGGERS,
} from '../../db/schema/automation.js';

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}

export class ListAutomationRulesQueryDto {
  @IsOptional()
  @IsIn(AUTOMATION_TRIGGERS, {
    message:
      'Trigger must be JOB_COMPLETED, INVOICE_SENT, PAYMENT_RECEIVED, or FOLLOW_UP_DUE',
  })
  triggerEvent?: (typeof AUTOMATION_TRIGGERS)[number];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive must be true or false' })
  isActive?: boolean;

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

export class ListAutomationExecutionsQueryDto {
  @IsOptional()
  @IsIn(AUTOMATION_EXECUTION_STATUSES, {
    message: 'Status must be PENDING, RUNNING, SUCCEEDED, or FAILED',
  })
  status?: (typeof AUTOMATION_EXECUTION_STATUSES)[number];

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
