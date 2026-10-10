import type { JobPriority, JobStatus } from '../../db/schema/job.js';

export class JobDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  requestId!: string;
  title!: string;
  description!: string | null;
  priority!: JobPriority;
  status!: JobStatus;
  location!: string | null;
  scheduledStart!: Date | null;
  scheduledEnd!: Date | null;
  estimatedDuration!: number | null;
  actualStart!: Date | null;
  actualEnd!: Date | null;
  completedAt!: Date | null;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class JobResponseDto {
  job!: JobDto;
}

export class JobListResponseDto {
  jobs!: JobDto[];
}
