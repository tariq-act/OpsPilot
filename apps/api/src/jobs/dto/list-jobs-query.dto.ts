import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JOB_PRIORITIES } from './create-job.dto.js';
import { JOB_STATUSES } from './update-job.dto.js';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListJobsQueryDto {
  @IsOptional()
  @IsIn(JOB_STATUSES, {
    message:
      'Status must be DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, or CANCELLED',
  })
  status?: (typeof JOB_STATUSES)[number];

  @IsOptional()
  @IsIn(JOB_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof JOB_PRIORITIES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Request id must be a string' })
  @MinLength(1, { message: 'Request id is required when provided' })
  @MaxLength(128, { message: 'Request id must be at most 128 characters' })
  requestId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fromDate must be a valid ISO date string' })
  fromDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'toDate must be a valid ISO date string' })
  toDate?: string;

  /** Filter to jobs with an active assignment for this technician profile id. */
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Technician id must be a string' })
  @MinLength(1, { message: 'Technician id is required when provided' })
  @MaxLength(128, { message: 'Technician id must be at most 128 characters' })
  technicianId?: string;
}
