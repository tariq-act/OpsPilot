import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import {
  CreateInvitationResponseDto,
  CreateOrganizationResponseDto,
  MemberListResponseDto,
  OrganizationListResponseDto,
  RemoveMemberResponseDto,
  UpdateMemberResponseDto,
} from './dto/organization-response.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('Organizations')
@ApiSession()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ type: CreateOrganizationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Organization slug already taken',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @Body() body: CreateOrganizationDto,
  ): Promise<CreateOrganizationResponseDto> {
    return this.organizationsService.create(session.user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for the signed-in user' })
  @ApiOkResponse({ type: OrganizationListResponseDto })
  async list(
    @Session() session: UserSession,
  ): Promise<OrganizationListResponseDto> {
    return this.organizationsService.listForUser(session.user.id);
  }

  @Post(':organizationId/invitations')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Invite a teammate',
    description:
      'Owners and admins can invite ADMIN, DISPATCHER, or TECHNICIAN.',
  })
  @ApiCreatedResponse({ type: CreateInvitationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({
    description: 'Caller is not an owner or admin',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Email is already a member or has a pending invitation',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async createInvitation(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Body() body: CreateInvitationDto,
  ): Promise<CreateInvitationResponseDto> {
    return this.organizationsService.createInvitation(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get(':organizationId/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiOkResponse({ type: MemberListResponseDto })
  @ApiForbiddenResponse({
    description: 'Caller is not an active member',
    type: ApiErrorDto,
  })
  async listMembers(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
  ): Promise<MemberListResponseDto> {
    return this.organizationsService.listMembers(
      session.user.id,
      organizationId,
    );
  }

  @Patch(':organizationId/members/:memberId')
  @ApiOperation({
    summary: 'Update a member role or status',
    description:
      'Send at least one of role or status. Owners cannot be changed.',
  })
  @ApiOkResponse({ type: UpdateMemberResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Member not found', type: ApiErrorDto })
  async updateMember(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberDto,
  ): Promise<UpdateMemberResponseDto> {
    return this.organizationsService.updateMember(
      session.user.id,
      organizationId,
      memberId,
      body,
    );
  }

  @Delete(':organizationId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member' })
  @ApiOkResponse({ type: RemoveMemberResponseDto })
  @ApiBadRequestResponse({
    description: 'Caller tried to remove themselves',
    type: ApiErrorDto,
  })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Member not found', type: ApiErrorDto })
  async removeMember(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ): Promise<RemoveMemberResponseDto> {
    return this.organizationsService.removeMember(
      session.user.id,
      organizationId,
      memberId,
    );
  }
}
