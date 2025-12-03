import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReplicateService } from './replicate.service';
import replicateConfig from '../config/replicate.config';

@Module({
  imports: [
    ConfigModule.forFeature(replicateConfig),
  ],
  providers: [ReplicateService],
  exports: [ReplicateService],
})
export class ReplicateModule {}