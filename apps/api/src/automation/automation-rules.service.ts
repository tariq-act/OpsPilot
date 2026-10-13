import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createAutomationRule,
  findAutomationRuleInOrganization,
  findActiveMembership,
  listAutomationExecutionsForRule,
  listAutomationRulesForOrganization,
  updateAutomationRuleInOrganization,
} from '../db/queries/index.js';
import type {
  AutomationAction,
  AutomationConditions,
  AutomationExecution,
  AutomationRule,
} from '../db/schema/automation.js';
import type { OrganizationMemberRole } from '../db/schema/organization.js';
import { ruleConfigError } from './automation.policy.js';
import type { CreateAutomationRuleDto } from './dto/create-automation-rule.dto.js';
import type { ListAutomationExecutionsQueryDto } from './dto/list-automation-query.dto.js';
import type { ListAutomationRulesQueryDto } from './dto/list-automation-query.dto.js';
import type { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto.js';

const AUTOMATION_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

function isAutomationManager(role: string): boolean {
  return (AUTOMATION_MANAGER_ROLES as readonly string[]).includes(role);
}

function toRuleDto(row: AutomationRule) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    triggerEvent: row.triggerEvent,
    conditions: row.conditions,
    actions: row.actions,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toExecutionDto(row: AutomationExecution) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ruleId: row.ruleId,
    eventId: row.eventId,
    status: row.status,
    input: row.input,
    result: row.result,
    error: row.error,
    idempotencyKey: row.idempotencyKey,
    attemptCount: row.attemptCount,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AutomationRulesService {
  private readonly logger = new Logger(AutomationRulesService.name);

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateAutomationRuleDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    this.assertConfig(dto.triggerEvent, dto.conditions, dto.actions);

    try {
      const created = await createAutomationRule({
        id: randomUUID(),
        organizationId,
        name: dto.name,
        description: dto.description ?? null,
        triggerEvent: dto.triggerEvent,
        conditions: dto.conditions,
        actions: dto.actions,
        isActive: dto.isActive ?? true,
        createdBy: actorUserId,
      });
      return { rule: toRuleDto(created) };
    } catch (error) {
      this.rethrowKnown(error);
      this.logger.error('Failed to create automation rule');
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create automation rule',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListAutomationRulesQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const rows = await listAutomationRulesForOrganization({
      organizationId,
      triggerEvent: query.triggerEvent,
      isActive: query.isActive,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
    return { rules: rows.map(toRuleDto) };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    ruleId: string,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const row = await this.requireRule(organizationId, ruleId);
    return { rule: toRuleDto(row) };
  }

  async update(
    actorUserId: string,
    organizationId: string,
    ruleId: string,
    dto: UpdateAutomationRuleDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    const existing = await this.requireRule(organizationId, ruleId);
    const triggerEvent = dto.triggerEvent ?? existing.triggerEvent;
    const conditions = dto.conditions ?? existing.conditions;
    const actions = dto.actions ?? existing.actions;
    this.assertConfig(triggerEvent, conditions, actions);

    try {
      const updated = await updateAutomationRuleInOrganization({
        organizationId,
        ruleId,
        name: dto.name,
        description: dto.description,
        triggerEvent: dto.triggerEvent,
        conditions: dto.conditions,
        actions: dto.actions,
      });
      if (!updated) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Automation rule not found',
          error: 'Not Found',
        });
      }
      return { rule: toRuleDto(updated) };
    } catch (error) {
      this.rethrowKnown(error);
      this.logger.error('Failed to update automation rule');
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to update automation rule',
        error: 'Internal Server Error',
      });
    }
  }

  async setActive(
    actorUserId: string,
    organizationId: string,
    ruleId: string,
    isActive: boolean,
  ) {
    await this.requireManager(organizationId, actorUserId);
    await this.requireRule(organizationId, ruleId);
    const updated = await updateAutomationRuleInOrganization({
      organizationId,
      ruleId,
      isActive,
    });
    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Automation rule not found',
        error: 'Not Found',
      });
    }
    return { rule: toRuleDto(updated) };
  }

  async listExecutions(
    actorUserId: string,
    organizationId: string,
    ruleId: string,
    query: ListAutomationExecutionsQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);
    await this.requireRule(organizationId, ruleId);
    const rows = await listAutomationExecutionsForRule({
      organizationId,
      ruleId,
      status: query.status,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
    return { executions: rows.map(toExecutionDto) };
  }

  private assertConfig(
    triggerEvent: string,
    conditions: AutomationConditions,
    actions: AutomationAction[],
  ) {
    const message = ruleConfigError(triggerEvent, conditions, actions);
    if (message) {
      throw new BadRequestException({
        statusCode: 400,
        message,
        error: 'Bad Request',
      });
    }
  }

  private async requireRule(organizationId: string, ruleId: string) {
    const row = await findAutomationRuleInOrganization(organizationId, ruleId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Automation rule not found',
        error: 'Not Found',
      });
    }
    return row;
  }

  private async requireManager(organizationId: string, userId: string) {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    if (!isAutomationManager(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners, admins, and dispatchers can manage automation',
        error: 'Forbidden',
      });
    }
    return membership;
  }

  private rethrowKnown(error: unknown): void {
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
  }
}
