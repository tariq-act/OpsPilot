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
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { OrganizationsService } from './organizations.service.js';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Session() session: UserSession,
    @Body() body: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(session.user.id, body);
  }

  @Get()
  async list(@Session() session: UserSession) {
    return this.organizationsService.listForUser(session.user.id);
  }

  @Post(':organizationId/invitations')
  @HttpCode(201)
  async createInvitation(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Body() body: CreateInvitationDto,
  ) {
    return this.organizationsService.createInvitation(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get(':organizationId/members')
  async listMembers(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationsService.listMembers(
      session.user.id,
      organizationId,
    );
  }

  @Patch(':organizationId/members/:memberId')
  async updateMember(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberDto,
  ) {
    return this.organizationsService.updateMember(
      session.user.id,
      organizationId,
      memberId,
      body,
    );
  }

  @Delete(':organizationId/members/:memberId')
  async removeMember(
    @Session() session: UserSession,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationsService.removeMember(
      session.user.id,
      organizationId,
      memberId,
    );
  }
}
