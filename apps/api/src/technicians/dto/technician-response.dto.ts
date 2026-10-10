import type { TechnicianStatus } from '../../db/schema/technician.js';

export class TechnicianDto {
  id!: string;
  organizationId!: string;
  userId!: string;
  employeeCode!: string;
  phone!: string | null;
  bio!: string | null;
  status!: TechnicianStatus;
  hireDate!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TechnicianResponseDto {
  technician!: TechnicianDto;
}

export class TechnicianListResponseDto {
  technicians!: TechnicianDto[];
}
