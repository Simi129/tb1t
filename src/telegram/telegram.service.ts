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
      const vercelUrl = process.env.VERCEL_URL;
      
      if (vercelUrl) {
        // ИСПРАВЛЕНО: webhook URL теперь указывает на api/telegram
        const webhookUrl = `https://${vercelUrl}/api/telegram`;
        
        try {
          await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
          this.logger.log('Old webhook deleted');
          
          const result = await this.bot.telegram.setWebhook(webhookUrl);
          this.logger.log(`Webhook set to: ${webhookUrl}, Result: ${result}`);
          
          const webhookInfo = await this.bot.telegram.getWebhookInfo();
          this.logger.log(`Webhook info: ${JSON.stringify(webhookInfo)}`);
        } catch (error) {
          this.logger.error(`Ошибка установки webhook: ${error.message}`);
        }
      } else {
        this.logger.warn('VERCEL_URL не найден');
      }
    } else {
      this.logger.log('Локальная разработка');
    }
  }

  async handleUpdate(update: any) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error(`Error handling update: ${error.message}`);
    }
  }

  getBot(): Telegraf {
    return this.bot;
  }
}