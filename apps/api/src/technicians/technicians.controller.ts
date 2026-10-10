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
import { CreateTechnicianDto } from './dto/create-technician.dto.js';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto.js';
import {
  TechnicianListResponseDto,
  TechnicianResponseDto,
} from './dto/technician-response.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { TechniciansService } from './technicians.service.js';

@ApiTags('Technicians')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a technician profile',
    description:
      'Owners and admins create a technician profile for an active organization member with role TECHNICIAN. organizationId comes from the session org header. Employee code is generated when omitted.',
  })
  @ApiCreatedResponse({ type: TechnicianResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description:
      'Technician already exists for this user, or employee code is taken',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateTechnicianDto,
  ): Promise<TechnicianResponseDto> {
    return this.techniciansService.create(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List technicians',
    description:
      'Owners, admins, and dispatchers see organization technicians. Technicians see only their own profile.',
  })
  @ApiOkResponse({ type: TechnicianListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListTechniciansQueryDto,
  ): Promise<TechnicianListResponseDto> {
    return this.techniciansService.list(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a technician by id' })
  @ApiOkResponse({ type: TechnicianResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<TechnicianResponseDto> {
    return this.techniciansService.getById(
      session.user.id,
      organizationId,
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a technician',
    description:
      'Owners and admins can update technician profile fields and status. Dispatchers cannot manage technician records.',
  })
  @ApiOkResponse({ type: TechnicianResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Employee code is already in use',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateTechnicianDto,
  ): Promise<TechnicianResponseDto> {
    return this.techniciansService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a technician',
    description:
      'Soft delete: sets status to INACTIVE. Does not remove the row.',
  })
  @ApiOkResponse({ type: TechnicianResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async softDelete(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<TechnicianResponseDto> {
    return this.techniciansService.softDelete(
      session.user.id,
      organizationId,
      id,
    );
  }
}
