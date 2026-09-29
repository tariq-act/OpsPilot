import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { AcceptInvitationResponseDto } from './dto/organization-response.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('Invitations')
@ApiSession()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post(':token/accept')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Accept a team invitation',
    description:
      'The signed-in user email must match the invitation. The token is the unguessable invite token, not the invitation id.',
  })
  @ApiOkResponse({ type: AcceptInvitationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({
    description: 'Invitation email does not match the signed-in user',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Invitation not found',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description:
      'Invitation is expired, no longer pending, or the user is already a member',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async accept(
    @Session() session: UserSession,
    @Param('token') token: string,
  ): Promise<AcceptInvitationResponseDto> {
    return this.organizationsService.acceptInvitation(
      session.user.id,
      session.user.email,
      token,
    );
  }
}
