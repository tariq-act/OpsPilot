import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationsService } from './organizations.service.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post(':token/accept')
  @HttpCode(200)
  async accept(
    @Session() session: UserSession,
    @Param('token') token: string,
  ) {
    return this.organizationsService.acceptInvitation(
      session.user.id,
      session.user.email,
      token,
    );
  }
}
