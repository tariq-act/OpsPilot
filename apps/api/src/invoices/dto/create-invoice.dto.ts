import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const INVOICE_ITEM_TYPES = [
  'LABOR',
  'PARTS',
  'OTHER',
  'FEE',
] as const;

const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;
const QUANTITY_REGEX = /^\d+(\.\d{1,2})?$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateInvoiceItemDto {
  @IsIn(INVOICE_ITEM_TYPES, {
    message: 'Item type must be LABOR, PARTS, OTHER, or FEE',
  })
  type!: (typeof INVOICE_ITEM_TYPES)[number];

  @Transform(trimString)
  @IsString({ message: 'Description is required' })
  @MinLength(1, { message: 'Description is required' })
  @MaxLength(500, { message: 'Description must be at most 500 characters' })
  description!: string;

  @Transform(trimString)
  @IsString({ message: 'Quantity is required' })
  @Matches(QUANTITY_REGEX, {
    message: 'Quantity must be a non-negative decimal with up to 2 places',
  })
  quantity!: string;

  @Transform(trimString)
  @IsString({ message: 'Unit price is required' })
  @Matches(MONEY_REGEX, {
    message: 'Unit price must be a non-negative decimal with up to 2 places',
  })
  unitPrice!: string;
}

export class CreateInvoiceDto {
  @Transform(trimString)
  @IsString({ message: 'Customer id is required' })
  @MinLength(1, { message: 'Customer id is required' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId!: string;

  @Transform(trimString)
  @IsString({ message: 'Job id is required' })
  @MinLength(1, { message: 'Job id is required' })
  @MaxLength(128, { message: 'Job id must be at most 128 characters' })
  jobId!: string;

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Discount must be a string' })
  @Matches(MONEY_REGEX, {
    message: 'Discount must be a non-negative decimal with up to 2 places',
  })
  discount?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Tax must be a string' })
  @Matches(MONEY_REGEX, {
    message: 'Tax must be a non-negative decimal with up to 2 places',
  })
  tax?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueAt must be a valid ISO date string' })
  dueAt?: string;
}
