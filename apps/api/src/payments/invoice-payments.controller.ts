import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
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
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import {
  PaymentListResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('invoices/:invoiceId/payments')
export class InvoicePaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Record a payment on an invoice',
    description:
      'Owners, admins, and dispatchers record a payment. Manual methods succeed immediately. ONLINE stays PENDING until a verified provider confirmation (not implemented yet). Totals and invoice status are recalculated on the server. Duplicate transactionId is idempotent.',
  })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createForInvoice(
      session.user.id,
      organizationId,
      invoiceId,
      body,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List payments for an invoice',
  })
  @ApiOkResponse({ type: PaymentListResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('invoiceId') invoiceId: string,
  ): Promise<PaymentListResponseDto> {
    return this.paymentsService.listForInvoice(
      session.user.id,
      organizationId,
      invoiceId,
    );
  }
}
