import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import {
  jobPhoto,
  type JobPhoto,
  type JobPhotoKind,
} from '../schema/job-photo.js';

export type CreateJobPhotoInput = {
  id: string;
  organizationId: string;
  jobId: string;
  kind: JobPhotoKind;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
};

export type DbExecutor = Pick<typeof db, 'insert' | 'select'>;

export async function createJobPhoto(
  input: CreateJobPhotoInput,
  executor: DbExecutor = db,
): Promise<JobPhoto> {
  const [row] = await executor
    .insert(jobPhoto)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      jobId: input.jobId,
      kind: input.kind,
      storageKey: input.storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedBy: input.uploadedBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create job photo');
  }
  return row;
}

export async function listPhotosForJob(
  organizationId: string,
  jobId: string,
): Promise<JobPhoto[]> {
  return db
    .select()
    .from(jobPhoto)
    .where(
      and(
        eq(jobPhoto.organizationId, organizationId),
        eq(jobPhoto.jobId, jobId),
      ),
    )
    .orderBy(asc(jobPhoto.createdAt));
}

export async function findPhotoInOrganization(
  organizationId: string,
  photoId: string,
): Promise<JobPhoto | null> {
  const [row] = await db
    .select()
    .from(jobPhoto)
    .where(
      and(
        eq(jobPhoto.id, photoId),
        eq(jobPhoto.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}
