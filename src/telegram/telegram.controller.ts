import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('webhook')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private telegramService: TelegramService) {}

  @Post('telegram')
  @HttpCode(200)
  async handleUpdate(@Body() update: any) {
    this.logger.debug(`Received update: ${JSON.stringify(update)}`);
    
    try {
      await this.telegramService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      return { ok: false, error: error.message };
    }
  }
}