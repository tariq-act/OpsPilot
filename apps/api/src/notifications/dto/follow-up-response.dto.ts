import type {
  FollowUpStatus,
  FollowUpType,
} from '../../db/schema/customer-follow-up.js';

export class FollowUpDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  jobId!: string | null;
  type!: FollowUpType;
  status!: FollowUpStatus;
  dueAt!: Date;
  notes!: string | null;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class FollowUpResponseDto {
  followUp!: FollowUpDto;
}

export class FollowUpListResponseDto {
  followUps!: FollowUpDto[];
}
