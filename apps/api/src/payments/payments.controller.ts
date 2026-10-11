import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { PaymentResponseDto } from './dto/payment-response.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getById(session.user.id, organizationId, id);
  }

  @Post(':id/refund')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refund a succeeded payment',
    description:
      'Owners and admins mark a SUCCEEDED manual payment as REFUNDED. History is preserved. Invoice amountPaid, amountDue, and status are recalculated. Online refunds are blocked until a payment provider is integrated.',
  })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async refund(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.refund(session.user.id, organizationId, id);
  }
}
