import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FOLLOW_UP_TYPES } from './create-follow-up.dto.js';
import { FOLLOW_UP_STATUSES } from './update-follow-up.dto.js';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListFollowUpsQueryDto {
  @IsOptional()
  @IsIn(FOLLOW_UP_STATUSES, {
    message: 'Status must be PENDING, SCHEDULED, COMPLETED, or CANCELLED',
  })
  status?: (typeof FOLLOW_UP_STATUSES)[number];

  @IsOptional()
  @IsIn(FOLLOW_UP_TYPES, {
    message: 'Type must be FEEDBACK or MAINTENANCE_REMINDER',
  })
  type?: (typeof FOLLOW_UP_TYPES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Job id must be a string' })
  @MinLength(1, { message: 'Job id is required when provided' })
  @MaxLength(128, { message: 'Job id must be at most 128 characters' })
  jobId?: string;
}
