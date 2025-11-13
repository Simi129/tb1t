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
    if (process.env.NODE_ENV === 'production') {
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        const webhookUrl = `https://${vercelUrl}/webhook/telegram`;
        try {
          await this.bot.telegram.setWebhook(webhookUrl);
          this.logger.log(`Webhook установлен: ${webhookUrl}`);
        } catch (error) {
          this.logger.error(`Ошибка установки webhook: ${error.message}`);
        }
      } else {
        this.logger.warn('VERCEL_URL не найден, webhook не установлен');
      }
    } else {
      this.logger.log('Локальная разработка: используется polling');
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