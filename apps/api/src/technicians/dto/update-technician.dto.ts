import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const TECHNICIAN_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class UpdateTechnicianDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Employee code must be a string' })
  @MinLength(1, { message: 'Employee code is required when provided' })
  @MaxLength(64, { message: 'Employee code must be at most 64 characters' })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message:
      'Employee code may only contain letters, numbers, dots, underscores, and hyphens',
  })
  employeeCode?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(32, { message: 'Phone must be at most 32 characters' })
  phone?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(2000, { message: 'Bio must be at most 2000 characters' })
  bio?: string | null;

  @IsOptional()
  @IsIn(TECHNICIAN_STATUSES, {
    message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED',
  })
  status?: (typeof TECHNICIAN_STATUSES)[number];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'hireDate must be a valid ISO date string' })
  hireDate?: string | null;
}
