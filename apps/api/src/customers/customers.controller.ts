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
import { OrganizationId } from '../common/organization-id.decorator.js';

// Swagger docs START
@ApiTags('Customers')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  description:
    'Active organization context. Must match an organization the signed-in user belongs to. Never sent in the request body.',
  required: true,
})
// Swagger docs END
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(201)
  // Swagger docs START
  @ApiOperation({
    summary: 'Create a customer',
    description:
      'Owners, admins, and dispatchers can create customers in the active organization.',
  })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  // Swagger docs END
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
  // Swagger docs START
  @ApiOperation({
    summary: 'List customers',
    description:
      'Managers see all org customers. Technicians see only customers linked to their assigned jobs.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  async list(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
  ): Promise<CustomerListResponseDto> {
    return this.customersService.list(session.user.id, organizationId);
  }

  @Get(':id')
  // Swagger docs START
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  // Swagger docs END
  async getById(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.getById(session.user.id, organizationId, id);
  }

  @Patch(':id')
  // Swagger docs START
  @ApiOperation({
    summary: 'Update a customer',
    description: 'Owners, admins, and dispatchers can update customers.',
  })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  // Swagger docs END
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
  // Swagger docs START
  @ApiOperation({
    summary: 'Deactivate a customer',
    description:
      'Soft delete: sets status to INACTIVE. Does not remove the row.',
  })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  // Swagger docs END
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
