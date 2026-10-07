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
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import {
  CustomerListResponseDto,
  CustomerResponseDto,
} from './dto/customer-response.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { OrganizationId } from './organization-id.decorator.js';

@ApiTags('Customers')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a customer',
    description:
      'Owners, admins, and dispatchers can create customers in the active organization.',
  })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async create(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Body() body: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(
      session.user.id,
      organizationId,
      body,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List customers',
    description:
      'Managers see all org customers. Technicians see only customers linked to their assigned jobs.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
  ): Promise<CustomerListResponseDto> {
    return this.customersService.list(session.user.id, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.getById(session.user.id, organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a customer',
    description: 'Owners, admins, and dispatchers can update customers.',
  })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async update(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(
      session.user.id,
      organizationId,
      id,
      body,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a customer',
    description:
      'Soft delete: sets status to INACTIVE. Does not remove the row.',
  })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async softDelete(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.softDelete(
      session.user.id,
      organizationId,
      id,
    );
  }
}
