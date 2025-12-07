import { Module } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import { StorageService } from './storage.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ImageProcessingService, StorageService],
  exports: [ImageProcessingService, StorageService],
})
export class ImageProcessingModule {}