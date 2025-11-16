import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { TelegramController } from './telegram.controller';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TelegramUpdate,
    StartCommand,
    HelpCommand,
  ],
  exports: [TelegramService], // ДОБАВЛЕНО: экспортируем TelegramService для использования в api/telegram.ts
})
export class TelegramModule {}