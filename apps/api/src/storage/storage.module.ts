import { Global, Module } from '@nestjs/common';
import { FILE_STORAGE } from './file-storage.js';
import { LocalDiskStorage } from './local-disk.storage.js';

@Global()
@Module({
  providers: [
    LocalDiskStorage,
    {
      provide: FILE_STORAGE,
      useExisting: LocalDiskStorage,
    },
  ],
  exports: [FILE_STORAGE, LocalDiskStorage],
})
export class StorageModule {}
