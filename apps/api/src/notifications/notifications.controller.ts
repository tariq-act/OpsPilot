import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { CustomerNotificationsService } from './customer-notifications.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto.js';

@ApiTags('Notifications')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: CustomerNotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List customer notification history',
    description:
      'Owners, admins, and dispatchers can view outbound customer notifications for the active organization. Notifications are created by business events, not by this API.',
  })
  @ApiOkResponse({ type: NotificationListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.list(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by id' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.getById(
      session.user.id,
      organizationId,
      id,
    );
  }

  @Post(':id/retry')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Retry a failed notification',
    description:
      'Resets a FAILED notification to PENDING and re-queues delivery. Respects max attempt limits.',
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  async retry(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.retry(
      session.user.id,
      organizationId,
      id,
    );
  }
}
