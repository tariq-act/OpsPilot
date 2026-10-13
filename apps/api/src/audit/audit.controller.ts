import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from '../common/organization-id.decorator.js';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { AuditService } from './audit.service.js';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto.js';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto.js';

@ApiTags('Audit Logs')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'List organization audit logs',
    description:
      'Owners and admins list append-only audit events for the active organization. Filter by actor, action, entity type, entity id, and date range. Results are newest first and paginated.',
  })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.auditService.list(session.user.id, organizationId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an audit log entry',
    description:
      'Owners and admins retrieve one audit event by id within the active organization.',
  })
  @ApiOkResponse({ type: AuditLogResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.getById(session.user.id, organizationId, id);
  }
}
