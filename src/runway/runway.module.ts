import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RunwayService } from './runway.service';
import runwayConfig from '../config/runway.config';

@Module({
  imports: [
    ConfigModule.forFeature(runwayConfig),
  ],
  providers: [RunwayService],
  exports: [RunwayService],
})
export class RunwayModule {}