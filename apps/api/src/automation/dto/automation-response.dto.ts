import type {
  AutomationAction,
  AutomationConditions,
  AutomationExecutionInput,
  AutomationExecutionResult,
  AutomationExecutionStatus,
  AutomationTrigger,
} from '../../db/schema/automation.js';

export class AutomationRuleDto {
  id!: string;
  organizationId!: string;
  name!: string;
  description!: string | null;
  triggerEvent!: AutomationTrigger;
  conditions!: AutomationConditions;
  actions!: AutomationAction[];
  isActive!: boolean;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AutomationRuleResponseDto {
  rule!: AutomationRuleDto;
}

export class AutomationRuleListResponseDto {
  rules!: AutomationRuleDto[];
}

export class AutomationExecutionDto {
  id!: string;
  organizationId!: string;
  ruleId!: string;
  eventId!: string;
  status!: AutomationExecutionStatus;
  input!: AutomationExecutionInput;
  result!: AutomationExecutionResult | null;
  error!: string | null;
  idempotencyKey!: string;
  attemptCount!: number;
  startedAt!: Date | null;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AutomationExecutionListResponseDto {
  executions!: AutomationExecutionDto[];
}
