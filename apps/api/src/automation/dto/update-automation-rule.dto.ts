import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AUTOMATION_TRIGGERS } from '../../db/schema/automation.js';
import {
  AutomationActionDto,
  AutomationConditionsDto,
} from './create-automation-rule.dto.js';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToNull({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(120, { message: 'Name must be at most 120 characters' })
  name?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description must be at most 2000 characters' })
  description?: string | null;

  @IsOptional()
  @IsIn(AUTOMATION_TRIGGERS, {
    message:
      'Trigger must be JOB_COMPLETED, INVOICE_SENT, PAYMENT_RECEIVED, or FOLLOW_UP_DUE',
  })
  triggerEvent?: (typeof AUTOMATION_TRIGGERS)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => AutomationConditionsDto)
  conditions?: AutomationConditionsDto;

  @IsOptional()
  @IsArray({ message: 'Actions must be a list' })
  @ArrayMaxSize(5, { message: 'A rule can have at most 5 actions' })
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions?: AutomationActionDto[];
}
