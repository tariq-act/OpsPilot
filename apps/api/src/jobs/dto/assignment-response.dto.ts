import type { JobAssignmentStatus } from '../../db/schema/job-assignment.js';
import { JobDto } from './job-response.dto.js';

export class JobAssignmentDto {
  id!: string;
  organizationId!: string;
  jobId!: string;
  technicianId!: string;
  status!: JobAssignmentStatus;
  assignedBy!: string;
  assignedAt!: Date;
  releasedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class JobAssignmentResponseDto {
  assignment!: JobAssignmentDto;
}

export class JobAssignmentListResponseDto {
  assignments!: JobAssignmentDto[];
}

export class ScheduleJobResponseDto {
  job!: JobDto;
}

export class AssignTechniciansResponseDto {
  job!: JobDto;
  assignments!: JobAssignmentDto[];
}

export class ReassignTechnicianResponseDto {
  job!: JobDto;
  released!: JobAssignmentDto;
  assignment!: JobAssignmentDto;
}
