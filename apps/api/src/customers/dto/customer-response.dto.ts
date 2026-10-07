import type { CustomerStatus } from '../../db/schema/customer.js';

export class CustomerDto {
  id!: string;
  organizationId!: string;
  name!: string;
  email!: string | null;
  phone!: string;
  address!: string | null;
  city!: string | null;
  state!: string | null;
  postalCode!: string | null;
  notes!: string | null;
  status!: CustomerStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CustomerResponseDto {
  customer!: CustomerDto;
}

export class CustomerListResponseDto {
  customers!: CustomerDto[];
}
