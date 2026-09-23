import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimLower({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class CreateOrganizationDto {
  @Transform(trimString)
  @IsString({ message: 'Name is required' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  name!: string;

  @Transform(trimLower)
  @IsString({ message: 'Slug is required' })
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(63, { message: 'Slug must be at most 63 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lowercase letters, numbers, and hyphens (no leading or trailing hyphen)',
  })
  slug!: string;

  @Transform(trimString)
  @IsString({ message: 'Timezone is required' })
  @MinLength(1, { message: 'Timezone is required' })
  @MaxLength(64, { message: 'Timezone must be at most 64 characters' })
  timezone!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Currency is required' })
  @MinLength(3, { message: 'Currency must be a 3-letter code' })
  @MaxLength(3, { message: 'Currency must be a 3-letter code' })
  currency!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(32, { message: 'Phone must be at most 32 characters' })
  phone?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must be at most 500 characters' })
  address?: string;
}
