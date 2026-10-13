import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from '../common/organization-id.decorator.js';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { AutomationRulesService } from './automation-rules.service.js';
import {
  AutomationExecutionListResponseDto,
  AutomationRuleListResponseDto,
  AutomationRuleResponseDto,
} from './dto/automation-response.dto.js';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto.js';
import {
  ListAutomationExecutionsQueryDto,
  ListAutomationRulesQueryDto,
} from './dto/list-automation-query.dto.js';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto.js';

@ApiTags('Automation')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('automation/rules')
export class AutomationController {
  constructor(private readonly rules: AutomationRulesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create an automation rule',
    description:
      'Owners, admins, and dispatchers create a rule. JOB_COMPLETED may create an invoice, send a notification, or schedule a follow-up. INVOICE_SENT may send a notification, schedule a follow-up, or send a payment reminder. PAYMENT_RECEIVED may send a notification or schedule a follow-up. FOLLOW_UP_DUE may send a notification or a payment reminder.',
  })
  @ApiCreatedResponse({ type: AutomationRuleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.rules.create(session.user.id, organizationId, body);
  }

  @Get()
  @ApiOperation({
    summary: 'List automation rules',
    description:
      'Owners, admins, and dispatchers list rules for the active organization. Results are limited and offset.',
  })
  @ApiOkResponse({ type: AutomationRuleListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListAutomationRulesQueryDto,
  ): Promise<AutomationRuleListResponseDto> {
    return this.rules.list(session.user.id, organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an automation rule' })
  @ApiOkResponse({ type: AutomationRuleResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.rules.getById(session.user.id, organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an automation rule',
    description:
      'Updates name, description, trigger, conditions, or actions. Trigger and action combinations are validated again. Use activate or deactivate to change whether the rule runs.',
  })
  @ApiOkResponse({ type: AutomationRuleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.rules.update(session.user.id, organizationId, id, body);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate an automation rule' })
  @ApiOkResponse({ type: AutomationRuleResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async activate(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.rules.setActive(session.user.id, organizationId, id, true);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an automation rule' })
  @ApiOkResponse({ type: AutomationRuleResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async deactivate(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.rules.setActive(session.user.id, organizationId, id, false);
  }

  @Get(':id/executions')
  @ApiOperation({
    summary: 'List executions for an automation rule',
    description:
      'Execution history for one rule in the active organization. Stored input is limited to operational ids.',
  })
  @ApiOkResponse({ type: AutomationExecutionListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async listExecutions(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Query() query: ListAutomationExecutionsQueryDto,
  ): Promise<AutomationExecutionListResponseDto> {
    return this.rules.listExecutions(
      session.user.id,
      organizationId,
      id,
      query,
    );
  }
}
