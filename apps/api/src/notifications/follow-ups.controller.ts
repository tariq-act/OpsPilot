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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from '../common/organization-id.decorator.js';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { CreateFollowUpDto } from './dto/create-follow-up.dto.js';
import {
  FollowUpListResponseDto,
  FollowUpResponseDto,
} from './dto/follow-up-response.dto.js';
import { ListFollowUpsQueryDto } from './dto/list-follow-ups-query.dto.js';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto.js';
import { FollowUpsService } from './follow-ups.service.js';

@ApiTags('Follow-ups')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a customer follow-up',
    description:
      'Owners, admins, and dispatchers schedule feedback or maintenance reminder follow-ups.',
  })
  @ApiCreatedResponse({ type: FollowUpResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    return this.followUpsService.create(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List follow-ups' })
  @ApiOkResponse({ type: FollowUpListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListFollowUpsQueryDto,
  ): Promise<FollowUpListResponseDto> {
    return this.followUpsService.list(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a follow-up by id' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<FollowUpResponseDto> {
    return this.followUpsService.getById(
      session.user.id,
      organizationId,
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a follow-up' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    return this.followUpsService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }
}
