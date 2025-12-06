import { Module } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { BroadcastCommand } from './commands/broadcast.command';
import { DatabaseModule } from '../../database/database.module';


@Module({
  imports: [
    DatabaseModule,
    // Импортируем Telegraf если используешь @nestjs/telegraf
    // Если нет - удали этот импорт и передавай bot через TelegramModule
  ],
  controllers: [BroadcastController],
  providers: [
    BroadcastService,
    BroadcastCommand,
  ],
  exports: [BroadcastService, BroadcastCommand],
})
export class BroadcastModule {}