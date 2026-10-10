import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
import {
  AssignTechniciansDto,
  ReassignTechnicianDto,
} from './dto/assign-technicians.dto.js';
import {
  AssignTechniciansResponseDto,
  JobAssignmentListResponseDto,
  JobAssignmentResponseDto,
  ReassignTechnicianResponseDto,
  ScheduleJobResponseDto,
} from './dto/assignment-response.dto.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import {
  JobListResponseDto,
  JobResponseDto,
} from './dto/job-response.dto.js';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto.js';
import { ScheduleJobDto } from './dto/schedule-job.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
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
      'Managers see org jobs (filterable by status, schedule date window, and technician). Technicians see only jobs with an active assignment to them.',
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

  @Get(':id/assignments')
  @ApiOperation({
    summary: 'List assignments for a job',
    description:
      'Managers see all assignment history. Technicians see history only for jobs they are actively assigned to.',
  })
  @ApiOkResponse({ type: JobAssignmentListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async listAssignments(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<JobAssignmentListResponseDto> {
    return this.jobsService.listAssignments(
      session.user.id,
      organizationId,
      id,
    );
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

  @Post(':id/schedule')
  @ApiOperation({
    summary: 'Schedule a job',
    description:
      'Owners, admins, and dispatchers set scheduledStart, scheduledEnd, and optional location. DRAFT jobs transition to CONFIRMED.',
  })
  @ApiOkResponse({ type: ScheduleJobResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Job cannot be scheduled from its current status',
    type: ApiErrorDto,
  })
  async schedule(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: ScheduleJobDto,
  ): Promise<ScheduleJobResponseDto> {
    return this.jobsService.schedule(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Put(':id/schedule')
  @ApiOperation({
    summary: 'Reschedule a job',
    description:
      'Owners, admins, and dispatchers update the schedule window and optional location for an already scheduled job.',
  })
  @ApiOkResponse({ type: ScheduleJobResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Job cannot be rescheduled from its current status',
    type: ApiErrorDto,
  })
  async reschedule(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: ScheduleJobDto,
  ): Promise<ScheduleJobResponseDto> {
    return this.jobsService.reschedule(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Post(':id/assignments')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Assign technicians to a job',
    description:
      'Owners, admins, and dispatchers assign one or more ACTIVE technicians. Overlapping assignments are rejected unless allowOverlap is true. Preserves assignment history.',
  })
  @ApiCreatedResponse({ type: AssignTechniciansResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Overlapping assignment or invalid job state',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async assignTechnicians(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: AssignTechniciansDto,
  ): Promise<AssignTechniciansResponseDto> {
    return this.jobsService.assignTechnicians(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Post(':id/assignments/:assignmentId/reassign')
  @ApiOperation({
    summary: 'Reassign a technician',
    description:
      'Releases the current ASSIGNED row (history retained) and creates a new ASSIGNED row for another ACTIVE technician.',
  })
  @ApiOkResponse({ type: ReassignTechnicianResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async reassignTechnician(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: ReassignTechnicianDto,
  ): Promise<ReassignTechnicianResponseDto> {
    return this.jobsService.reassignTechnician(
      session.user.id,
      organizationId,
      id,
      assignmentId,
      body,
    );
  }

  @Patch(':id/assignments/:assignmentId')
  @ApiOperation({
    summary: 'Update assignment status',
    description:
      'Release or cancel an active assignment. Valid transitions: ASSIGNED → RELEASED | CANCELLED.',
  })
  @ApiOkResponse({ type: JobAssignmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Invalid assignment status transition',
    type: ApiErrorDto,
  })
  async updateAssignment(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: UpdateAssignmentDto,
  ): Promise<JobAssignmentResponseDto> {
    return this.jobsService.updateAssignment(
      session.user.id,
      organizationId,
      id,
      assignmentId,
      body,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a job',
    description:
      'Managers can update any org job. Technicians can update assigned jobs only. Status transitions are enforced. Use schedule endpoints for schedule changes.',
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
      'Soft cancel: sets status to CANCELLED and cancels active assignments. Does not remove rows.',
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
