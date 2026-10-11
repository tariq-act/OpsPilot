import type { JobActivityAction } from '../../db/schema/job-activity.js';
import type { JobPhotoKind } from '../../db/schema/job-photo.js';
import type { JobStatus } from '../../db/schema/job.js';
import { JobDto } from './job-response.dto.js';

export class JobNoteDto {
  id!: string;
  organizationId!: string;
  jobId!: string;
  body!: string;
  createdBy!: string;
  createdAt!: Date;
}

export class JobPhotoDto {
  id!: string;
  organizationId!: string;
  jobId!: string;
  kind!: JobPhotoKind;
  fileName!: string;
  mimeType!: string;
  sizeBytes!: number;
  uploadedBy!: string;
  createdAt!: Date;
}

export class JobActivityDto {
  id!: string;
  organizationId!: string;
  jobId!: string;
  action!: JobActivityAction;
  fromStatus!: JobStatus | null;
  toStatus!: JobStatus | null;
  message!: string | null;
  actorUserId!: string;
  createdAt!: Date;
}

export class JobNoteResponseDto {
  note!: JobNoteDto;
}

export class JobNoteListResponseDto {
  notes!: JobNoteDto[];
}

export class JobPhotoResponseDto {
  photo!: JobPhotoDto;
}

export class JobPhotoListResponseDto {
  photos!: JobPhotoDto[];
}

export class JobActivityListResponseDto {
  activities!: JobActivityDto[];
}

export class JobExecutionResponseDto {
  job!: JobDto;
  notes!: JobNoteDto[];
  photos!: JobPhotoDto[];
  activities!: JobActivityDto[];
}
