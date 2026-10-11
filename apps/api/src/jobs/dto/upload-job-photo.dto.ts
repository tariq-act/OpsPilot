import { IsIn } from 'class-validator';

export const JOB_PHOTO_KINDS = ['BEFORE', 'AFTER', 'OTHER'] as const;

export class UploadJobPhotoDto {
  @IsIn(JOB_PHOTO_KINDS, {
    message: 'Kind must be BEFORE, AFTER, or OTHER',
  })
  kind!: (typeof JOB_PHOTO_KINDS)[number];
}
