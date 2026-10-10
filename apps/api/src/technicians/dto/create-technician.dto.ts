import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateTechnicianDto {
  @Transform(trimString)
  @IsString({ message: 'User id is required' })
  @MinLength(1, { message: 'User id is required' })
  @MaxLength(128, { message: 'User id must be at most 128 characters' })
  userId!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Employee code must be a string' })
  @MinLength(1, { message: 'Employee code is required when provided' })
  @MaxLength(64, { message: 'Employee code must be at most 64 characters' })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message:
      'Employee code may only contain letters, numbers, dots, underscores, and hyphens',
  })
  employeeCode?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(32, { message: 'Phone must be at most 32 characters' })
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(2000, { message: 'Bio must be at most 2000 characters' })
  bio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hireDate must be a valid ISO date string' })
  hireDate?: string;
}
