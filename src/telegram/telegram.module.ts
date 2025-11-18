import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [
    TelegramService,
    TelegramUpdate,
    StartCommand,
    HelpCommand,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}