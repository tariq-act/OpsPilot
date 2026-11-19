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
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import {
  InvoiceListResponseDto,
  InvoiceResponseDto,
} from './dto/invoice-response.dto.js';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { InvoicesService } from './invoices.service.js';

// Swagger docs START
@ApiTags('Invoices')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
// Swagger docs END
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(201)
  // Swagger docs START
  @ApiOperation({
    summary: 'Create an invoice',
    description:
      'Owners, admins, and dispatchers create a DRAFT invoice for a completed job. Totals are calculated on the server.',
  })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get()
  // Swagger docs START
  @ApiOperation({
    summary: 'List invoices',
    description:
      'Managers see all org invoices. Technicians see invoices for jobs they are assigned to.',
  })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.invoicesService.list(
      session.user.id,
      organizationId,
      query,
    );
  }

  @Get(':id')
  // Swagger docs START
  @ApiOperation({ summary: 'Get an invoice by id' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  // Swagger docs END
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.getById(
      session.user.id,
      organizationId,
      id,
    );
  }

  @Patch(':id')
  // Swagger docs START
  @ApiOperation({
    summary: 'Update a draft invoice',
    description:
      'Only DRAFT invoices can be modified. Line items, discount, tax, and due date may change; totals are recalculated on the server.',
  })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Post(':id/send')
  @HttpCode(200)
  // Swagger docs START
  @ApiOperation({
    summary: 'Send an invoice',
    description:
      'Transitions DRAFT → SENT and sets issuedAt. Does not deliver email yet.',
  })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  // Swagger docs END
  async send(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.send(session.user.id, organizationId, id);
  }

  @Post(':id/void')
  @HttpCode(200)
  // Swagger docs START
  @ApiOperation({
    summary: 'Void an invoice',
    description:
      'Soft-cancels the invoice (status VOID). Paid invoices cannot be voided. Rows are never deleted.',
  })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  // Swagger docs END
  async void(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.void(session.user.id, organizationId, id);
  }
}
