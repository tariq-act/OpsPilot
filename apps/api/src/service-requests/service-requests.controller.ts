import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { ListServiceRequestsQueryDto } from './dto/list-service-requests-query.dto.js';
import {
  ServiceRequestListResponseDto,
  ServiceRequestResponseDto,
} from './dto/service-request-response.dto.js';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto.js';
import { ServiceRequestsService } from './service-requests.service.js';

@ApiTags('Service Requests')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a service request',
    description:
      'Owners, admins, and dispatchers can create requests for an active customer in the organization.',
  })
  @ApiCreatedResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestsService.create(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List service requests',
    description:
      'Managers see org requests (filterable). Technicians see only requests linked to their assigned work.',
  })
  @ApiOkResponse({ type: ServiceRequestListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListServiceRequestsQueryDto,
  ): Promise<ServiceRequestListResponseDto> {
    return this.serviceRequestsService.list(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service request by id' })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestsService.getById(
      session.user.id,
      organizationId,
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a service request',
    description:
      'Owners, admins, and dispatchers can update fields and status (valid transitions only).',
  })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Invalid status transition',
    type: ApiErrorDto,
  })
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestsService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel a service request',
    description:
      'Soft cancel: sets status to CANCELLED. Does not remove the row.',
  })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Request cannot be cancelled from its current status',
    type: ApiErrorDto,
  })
  async softCancel(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestsService.softCancel(
      session.user.id,
      organizationId,
      id,
    );
  }
}
