import type {
  ServiceRequestPriority,
  ServiceRequestSource,
  ServiceRequestStatus,
} from '../../db/schema/service-request.js';

export class ServiceRequestDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  title!: string;
  description!: string | null;
  priority!: ServiceRequestPriority;
  status!: ServiceRequestStatus;
  source!: ServiceRequestSource;
  preferredDate!: Date | null;
  preferredTime!: string | null;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ServiceRequestResponseDto {
  serviceRequest!: ServiceRequestDto;
}

export class ServiceRequestListResponseDto {
  serviceRequests!: ServiceRequestDto[];
}
