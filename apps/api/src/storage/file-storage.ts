/**
 * Swappable binary object storage for job photos and future uploads.
 * Local disk is the default implementation; S3/Supabase can implement this later.
 */

export type StoredObject = {
  key: string;
  sizeBytes: number;
  contentType: string;
};

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type GetObjectResult = {
  body: Buffer;
  contentType: string;
  sizeBytes: number;
};

export abstract class FileStorage {
  abstract put(input: PutObjectInput): Promise<StoredObject>;
  abstract get(key: string): Promise<GetObjectResult | null>;
  abstract delete(key: string): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
