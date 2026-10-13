import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  actionShapeError,
  AUTOMATION_ACTION_TYPES,
  ruleConfigError,
} from '../automation.policy.js';
import { CreateInvoiceItemDto } from '../../invoices/dto/create-invoice.dto.js';
import { AUTOMATION_TRIGGERS } from '../../db/schema/automation.js';
import type {
  AutomationAction,
  AutomationConditions,
} from '../../db/schema/automation.js';

export const AUTOMATION_CONDITION_FIELDS = [
  'customerId',
  'jobId',
  'invoiceId',
  'paymentId',
  'followUpId',
  'followUpType',
  'currency',
  'method',
] as const;

export const AUTOMATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'] as const;
export const AUTOMATION_FOLLOW_UP_TYPES = [
  'FEEDBACK',
  'MAINTENANCE_REMINDER',
] as const;

const SAFE_TOKEN = /^[A-Za-z0-9.:_-]{1,128}$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

@ValidatorConstraint({ name: 'automationActionShape', async: false })
export class AutomationActionShapeConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    return actionShapeError(args.object as AutomationAction) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      actionShapeError(args.object as AutomationAction) ??
      'Action parameters do not match the action type'
    );
  }
}

@ValidatorConstraint({ name: 'automationRuleConfig', async: false })
export class AutomationRuleConfigConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as {
      triggerEvent?: string;
      conditions?: AutomationConditions;
      actions?: AutomationAction[];
    };
    if (!dto.triggerEvent || !dto.conditions || !dto.actions) return true;
    return (
      ruleConfigError(dto.triggerEvent, dto.conditions, dto.actions) === null
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as {
      triggerEvent?: string;
      conditions?: AutomationConditions;
      actions?: AutomationAction[];
    };
    if (!dto.triggerEvent || !dto.conditions || !dto.actions) {
      return 'Invalid automation rule';
    }
    return (
      ruleConfigError(dto.triggerEvent, dto.conditions, dto.actions) ??
      'Invalid automation rule'
    );
  }
}

export class AutomationConditionRuleDto {
  @IsIn(AUTOMATION_CONDITION_FIELDS, {
    message: 'Condition field is not supported',
  })
  field!: (typeof AUTOMATION_CONDITION_FIELDS)[number];

  @IsIn(['eq', 'neq'], { message: 'Condition operator must be eq or neq' })
  operator!: 'eq' | 'neq';

  @Matches(SAFE_TOKEN, {
    message: 'Condition value must be 1 to 128 letters, numbers, or .:_-',
  })
  value!: string;
}

export class AutomationConditionsDto {
  @IsIn(['all', 'any'], { message: 'Conditions match must be all or any' })
  match!: 'all' | 'any';

  @IsArray({ message: 'Conditions rules must be a list' })
  @ArrayMaxSize(10, { message: 'A rule can have at most 10 conditions' })
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionRuleDto)
  rules!: AutomationConditionRuleDto[];
}

export class AutomationActionDto {
  @Validate(AutomationActionShapeConstraint)
  @IsIn(AUTOMATION_ACTION_TYPES, { message: 'Unknown action type' })
  type!: (typeof AUTOMATION_ACTION_TYPES)[number];

  @IsOptional()
  @IsArray({ message: 'Items must be a list' })
  @ArrayMaxSize(20, { message: 'Create invoice accepts at most 20 line items' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items?: CreateInvoiceItemDto[];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Discount must be a string' })
  @Matches(MONEY, {
    message: 'Discount must be a non-negative decimal with up to 2 places',
  })
  discount?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Tax must be a string' })
  @Matches(MONEY, {
    message: 'Tax must be a non-negative decimal with up to 2 places',
  })
  tax?: string;

  @IsOptional()
  @IsInt({ message: 'dueInDays must be a whole number' })
  @Min(0, { message: 'dueInDays must be at least 0' })
  @Max(365, { message: 'dueInDays must be at most 365' })
  dueInDays?: number;

  @IsOptional()
  @IsIn(AUTOMATION_CHANNELS, {
    message: 'Channel must be EMAIL, SMS, or WHATSAPP',
  })
  channel?: (typeof AUTOMATION_CHANNELS)[number];

  @IsOptional()
  @IsIn(AUTOMATION_FOLLOW_UP_TYPES, {
    message: 'Follow-up type must be FEEDBACK or MAINTENANCE_REMINDER',
  })
  followUpType?: (typeof AUTOMATION_FOLLOW_UP_TYPES)[number];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must be at most 2000 characters' })
  notes?: string;
}

export class CreateAutomationRuleDto {
  @Transform(trimString)
  @IsString({ message: 'Name is required' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(120, { message: 'Name must be at most 120 characters' })
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description must be at most 2000 characters' })
  description?: string;

  @Validate(AutomationRuleConfigConstraint)
  @IsIn(AUTOMATION_TRIGGERS, {
    message:
      'Trigger must be JOB_COMPLETED, INVOICE_SENT, PAYMENT_RECEIVED, or FOLLOW_UP_DUE',
  })
  triggerEvent!: (typeof AUTOMATION_TRIGGERS)[number];

  @ValidateNested()
  @Type(() => AutomationConditionsDto)
  conditions!: AutomationConditionsDto;

  @IsArray({ message: 'Actions must be a list' })
  @ArrayMaxSize(5, { message: 'A rule can have at most 5 actions' })
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions!: AutomationActionDto[];

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
