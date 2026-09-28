import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';

@Module({
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
