import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
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
}
