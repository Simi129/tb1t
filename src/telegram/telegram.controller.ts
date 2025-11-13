import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller()
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private telegramService: TelegramService) {}

  @Post('api/telegram')
  @HttpCode(200)
  async handleUpdate(@Body() update: any) {
    this.logger.log('Webhook received');
    
    try {
      await this.telegramService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      return { ok: false };
    }
  }
}