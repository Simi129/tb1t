import { Controller, Post, Body, Get, HttpCode, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('api/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  // Основной webhook endpoint - сюда Telegram шлет обновления
  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() update: any) {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`📨 Webhook получен: UpdateID=${update.update_id}`);
      
      await this.telegramService.handleUpdate(update);
      
      const processingTime = Date.now() - startTime;
      this.logger.debug(`✅ Webhook обработан за ${processingTime}мс`);
      
      return { ok: true };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Ошибка обработки webhook (${processingTime}мс): ${error.message}`,
        error.stack,
      );
      
      // Возвращаем 200, чтобы Telegram не повторял запрос
      return { ok: false, error: error.message };
    }
  }

  // Проверка что endpoint доступен (GET запросы Telegram игнорирует)
  @Get()
  async checkWebhook() {
    return {
      status: 'Webhook endpoint is active',
      message: 'POST requests are handled here',
      timestamp: new Date().toISOString(),
    };
  }

  // Эндпоинт для получения статистики бота
  @Get('stats')
  async getStats() {
    try {
      const stats = this.telegramService.getStats();
      const webhookInfo = await this.telegramService
        .getBot()
        .telegram.getWebhookInfo();
      
      return {
        bot_stats: stats,
        webhook_info: {
          url: webhookInfo.url,
          pending_updates: webhookInfo.pending_update_count,
          last_error_date: webhookInfo.last_error_date,
          last_error_message: webhookInfo.last_error_message,
          max_connections: webhookInfo.max_connections,
          allowed_updates: webhookInfo.allowed_updates,
        },
      };
    } catch (error) {
      return {
        error: 'Failed to get stats',
        message: error.message,
      };
    }
  }

  // Эндпоинт для переустановки webhook (на случай проблем)
  @Post('reset-webhook')
  @HttpCode(200)
  async resetWebhook() {
    try {
      this.logger.log('🔄 Переустановка webhook...');
      const webhookInfo = await this.telegramService.resetWebhook();
      this.logger.log('✅ Webhook переустановлен');
      
      return {
        success: true,
        webhook_info: webhookInfo,
      };
    } catch (error) {
      this.logger.error(`❌ Ошибка переустановки webhook: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}