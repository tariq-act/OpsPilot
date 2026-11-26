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
  UpdateOrganizationResponseDto,
  InvitationListResponseDto,
} from './dto/organization-response.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

// Swagger docs START
@ApiTags('Organizations')
@ApiSession()
// Swagger docs END
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(201)
  // Swagger docs START
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ type: CreateOrganizationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Organization slug already taken',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async create(
    @Session() session: UserSession,
    @Body() body: CreateOrganizationDto,
  ): Promise<CreateOrganizationResponseDto> {
    return this.organizationsService.create(session.user.id, body);
  }

  @Get()
  // Swagger docs START
  @ApiOperation({
    summary:
      'List organizations where the signed-in user has an active membership',
  })
  @ApiOkResponse({ type: OrganizationListResponseDto })
  // Swagger docs END
  async list(
    @Session() session: UserSession,
  ): Promise<OrganizationListResponseDto> {
    return this.organizationsService.listForUser(session.user.id);
  }

  @Patch(':organizationId')
  // Swagger docs START
  @ApiOperation({ summary: 'Update organization settings (owner or admin)' })
  @ApiOkResponse({ type: UpdateOrganizationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Slug is taken or currency is locked by existing invoices',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async update(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Body() body: UpdateOrganizationDto,
  ): Promise<UpdateOrganizationResponseDto> {
    return this.organizationsService.update(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get(':organizationId/invitations')
  // Swagger docs START
  @ApiOperation({
    summary: 'List invitations without secret tokens (owner or admin)',
  })
  @ApiOkResponse({ type: InvitationListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async listInvitations(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
  ): Promise<InvitationListResponseDto> {
    return this.organizationsService.listInvitations(
      session.user.id,
      organizationId,
    );
  }

  @Delete(':organizationId/invitations/:invitationId')
  // Swagger docs START
  @ApiOperation({ summary: 'Revoke a pending invitation (owner or admin)' })
  @ApiOkResponse({ type: RemoveMemberResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async revokeInvitation(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ): Promise<RemoveMemberResponseDto> {
    return this.organizationsService.revokeInvitation(
      session.user.id,
      organizationId,
      invitationId,
    );
  }

  @Post(':organizationId/invitations')
  @HttpCode(201)
  // Swagger docs START
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
  // Swagger docs END
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
  // Swagger docs START
  @ApiOperation({ summary: 'List organization members' })
  @ApiOkResponse({ type: MemberListResponseDto })
  @ApiForbiddenResponse({
    description: 'Caller is not an active member',
    type: ApiErrorDto,
  })
  // Swagger docs END
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
  // Swagger docs START
  @ApiOperation({
    summary: 'Update a member role or status',
    description:
      'Send at least one of role or status. Owners and your own membership cannot be changed. Invited members must accept before activation.',
  })
  @ApiOkResponse({ type: UpdateMemberResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Member not found', type: ApiErrorDto })
  // Swagger docs END
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
  // Swagger docs START
  @ApiOperation({ summary: 'Remove a member' })
  @ApiOkResponse({ type: RemoveMemberResponseDto })
  @ApiBadRequestResponse({
    description: 'Caller tried to remove themselves',
    type: ApiErrorDto,
  })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Member not found', type: ApiErrorDto })
  // Swagger docs END
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
