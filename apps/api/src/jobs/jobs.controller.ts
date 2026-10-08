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
import { CreateJobDto } from './dto/create-job.dto.js';
import {
  JobListResponseDto,
  JobResponseDto,
} from './dto/job-response.dto.js';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { JobsService } from './jobs.service.js';

@ApiTags('Jobs')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a job',
    description:
      'Owners, admins, and dispatchers create a job from an ACCEPTED service request. One job per request.',
  })
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'A job already exists for this service request',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateJobDto,
  ): Promise<JobResponseDto> {
    return this.jobsService.create(session.user.id, organizationId, body);
  }

  @Get()
  @ApiOperation({
    summary: 'List jobs',
    description:
      'Managers see org jobs (filterable). Technicians see only jobs assigned to them (assignment not implemented yet).',
  })
  @ApiOkResponse({ type: JobListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListJobsQueryDto,
  ): Promise<JobListResponseDto> {
    return this.jobsService.list(session.user.id, organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by id' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.getById(session.user.id, organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a job',
    description:
      'Managers can update any org job. Technicians can update assigned jobs only (assignment later). Status transitions are enforced.',
  })
  @ApiOkResponse({ type: JobResponseDto })
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
    @Body() body: UpdateJobDto,
  ): Promise<JobResponseDto> {
    return this.jobsService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel a job',
    description:
      'Soft cancel: sets status to CANCELLED. Does not remove the row.',
  })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Job cannot be cancelled from its current status',
    type: ApiErrorDto,
  })
  async softCancel(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.softCancel(session.user.id, organizationId, id);
  }
}
