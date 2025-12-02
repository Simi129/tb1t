import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramHandlers } from './telegram.handlers';
import { TelegramController } from './telegram.controller';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { SubscriptionCommand } from './commands/subscription.command';
import { SubscriptionService } from './subscription.service';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TelegramHandlers,
    StartCommand,
    HelpCommand,
    SubscriptionCommand,
    SubscriptionService,
  ],
  exports: [TelegramService, SubscriptionService, TelegramHandlers],
})
export class TelegramModule {}