import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SERVICE_REQUEST_PRIORITIES } from './create-service-request.dto.js';
import { SERVICE_REQUEST_STATUSES } from './update-service-request.dto.js';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListServiceRequestsQueryDto {
  @IsOptional()
  @IsIn(SERVICE_REQUEST_STATUSES, {
    message:
      'Status must be NEW, IN_REVIEW, ACCEPTED, REJECTED, or CANCELLED',
  })
  status?: (typeof SERVICE_REQUEST_STATUSES)[number];

  @IsOptional()
  @IsIn(SERVICE_REQUEST_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof SERVICE_REQUEST_PRIORITIES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fromDate must be a valid ISO date string' })
  fromDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'toDate must be a valid ISO date string' })
  toDate?: string;
}
