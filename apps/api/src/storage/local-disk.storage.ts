import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  FileStorage,
  type GetObjectResult,
  type PutObjectInput,
  type StoredObject,
} from './file-storage.js';

@Injectable()
export class LocalDiskStorage extends FileStorage {
  private readonly logger = new Logger(LocalDiskStorage.name);
  private readonly rootDir: string;

  constructor() {
    super();
    const configured = process.env.UPLOAD_DIR?.trim();
    this.rootDir = resolve(
      configured && configured.length > 0
        ? configured
        : join(process.cwd(), 'uploads'),
    );
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const absolute = this.resolveKey(input.key);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, input.body);
    return {
      key: input.key,
      sizeBytes: input.body.byteLength,
      contentType: input.contentType,
    };
  }

  async get(key: string): Promise<GetObjectResult | null> {
    try {
      const absolute = this.resolveKey(key);
      const body = await readFile(absolute);
      return {
        body,
        contentType: 'application/octet-stream',
        sizeBytes: body.byteLength,
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'ENOENT'
      ) {
        return null;
      }
      this.logger.error(`Failed to read object ${key}`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    }
  }

  private resolveKey(key: string): string {
    const normalized = key.replace(/^\/+/, '');
    if (
      normalized.includes('..') ||
      normalized.includes('\\') ||
      normalized.length === 0
    ) {
      throw new Error('Invalid storage key');
    }
    const absolute = join(this.rootDir, normalized);
    if (!absolute.startsWith(this.rootDir)) {
      throw new Error('Invalid storage key');
    }
    return absolute;
  }
}
