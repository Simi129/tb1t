import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    const token = this.configService.get<string>('telegram.token');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.logger.log('TelegramService initializing...');
    
    if (process.env.NODE_ENV === 'production') {
      // ИСПРАВЛЕНО: используем кастомный домен или переменную WEBHOOK_URL
      const webhookDomain = process.env.WEBHOOK_URL || 'tb1t.vercel.app';
      const webhookUrl = `https://${webhookDomain}/api/telegram`;
      
      this.logger.log(`🔧 Setting webhook to: ${webhookUrl}`);
      
      try {
        // Удаляем старый webhook
        await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
        this.logger.log('✅ Old webhook deleted');
        
        // Устанавливаем новый webhook
        const result = await this.bot.telegram.setWebhook(webhookUrl);
        this.logger.log(`✅ Webhook set successfully: ${result}`);
        
        // Проверяем установку webhook
        const webhookInfo = await this.bot.telegram.getWebhookInfo();
        this.logger.log(`📊 Webhook info: ${JSON.stringify(webhookInfo, null, 2)}`);
        
        if (webhookInfo.url !== webhookUrl) {
          this.logger.error(`❌ Webhook URL mismatch! Expected: ${webhookUrl}, Got: ${webhookInfo.url}`);
        }
      } catch (error) {
        this.logger.error(`❌ Error setting webhook: ${error.message}`);
        throw error;
      }
    } else {
      this.logger.log('🔧 Local development mode - webhook not set');
    }
  }

  async handleUpdate(update: any) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error(`❌ Error handling update: ${error.message}`);
      throw error;
    }
  }

  getBot(): Telegraf {
    return this.bot;
  }
}