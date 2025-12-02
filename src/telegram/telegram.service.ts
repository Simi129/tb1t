import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { DatabaseService } from '../database/database.service';
import { TelegramHandlers } from './telegram.handlers';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);
  
  private stats = {
    totalRequests: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
  };

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    @Inject(forwardRef(() => TelegramHandlers))
    private telegramHandlers: TelegramHandlers,
  ) {
    const token = this.configService.get<string>('telegram.token');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.logger.log('🔧 TelegramService инициализируется...');
    
    // Устанавливаем webhook только в production
    if (process.env.NODE_ENV === 'production') {
      await this.setupWebhook();
    } else {
      this.logger.log('🛠 Режим разработки - webhook не устанавливается');
    }
  }

  private async setupWebhook() {
    const webhookUrl = process.env.WEBHOOK_URL || 'https://tb1t-production.up.railway.app/api/telegram';
    
    this.logger.log(`🔗 Устанавливаем webhook: ${webhookUrl}`);
    
    try {
      // Удаляем старый webhook
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
      this.logger.log('✅ Старый webhook удален');
      
      // Устанавливаем новый webhook
      const result = await this.bot.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query', 'edited_message'],
      });
      
      this.logger.log(`✅ Webhook установлен: ${result}`);
      
      // Проверяем установку webhook
      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      this.logger.log(`📊 Webhook Info:`, {
        url: webhookInfo.url,
        pending_updates: webhookInfo.pending_update_count,
        last_error: webhookInfo.last_error_message || 'нет',
      });
      
      if (webhookInfo.url !== webhookUrl) {
        this.logger.error(`❌ Несоответствие URL! Ожидалось: ${webhookUrl}, Получено: ${webhookInfo.url}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Ошибка установки webhook: ${error.message}`);
      throw error;
    }
  }

  async handleUpdate(update: any) {
    const startTime = Date.now();
    
    try {
      const updateType = this.getUpdateType(update);
      const userId = this.getUserId(update);
      
      this.logger.debug(
        `📨 Обновление: Тип=${updateType}, User=${userId}, ID=${update.update_id}`
      );
      
      // Создаём контекст из обновления
      const ctx = await this.createContext(update);
      
      // Передаём в обработчик
      await this.telegramHandlers.handleUpdate(ctx);
      
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime);
      
      const emoji = this.getSpeedEmoji(processingTime);
      this.logger.log(
        `${emoji} Обработано за ${processingTime}мс ` +
        `(avg: ${this.getAvgTime()}мс, min: ${this.stats.minTime}мс, max: ${this.stats.maxTime}мс)`
      );
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Ошибка обработки (${processingTime}мс): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Создаём Telegraf Context из update объекта
   */
  private async createContext(update: any): Promise<any> {
    // Telegraf использует bot.handleUpdate для создания контекста
    // Но мы можем создать его вручную
    const ctx = {
      telegram: this.bot.telegram,
      bot: this.bot,
      update: update,
      message: update.message,
      from: update.message?.from || update.callback_query?.from,
      chat: update.message?.chat || update.callback_query?.message?.chat,
      
      // Методы для ответа
      reply: async (text: string, extra?: any) => {
        if (!ctx.chat) throw new Error('No chat in context');
        return await this.bot.telegram.sendMessage(ctx.chat.id, text, extra);
      },
      
      replyWithPhoto: async (photo: any, extra?: any) => {
        if (!ctx.chat) throw new Error('No chat in context');
        return await this.bot.telegram.sendPhoto(ctx.chat.id, photo, extra);
      },
    };
    
    return ctx;
  }

  private getUpdateType(update: any): string {
    if (update.message) return 'message';
    if (update.callback_query) return 'callback_query';
    if (update.edited_message) return 'edited_message';
    if (update.channel_post) return 'channel_post';
    return 'unknown';
  }

  private getUserId(update: any): number | string {
    if (update.message?.from?.id) return update.message.from.id;
    if (update.callback_query?.from?.id) return update.callback_query.from.id;
    return 'unknown';
  }

  private updateStats(time: number) {
    this.stats.totalRequests++;
    this.stats.totalTime += time;
    this.stats.minTime = Math.min(this.stats.minTime, time);
    this.stats.maxTime = Math.max(this.stats.maxTime, time);
  }

  private getAvgTime(): number {
    return this.stats.totalRequests > 0 
      ? Math.round(this.stats.totalTime / this.stats.totalRequests) 
      : 0;
  }

  private getSpeedEmoji(ms: number): string {
    if (ms < 100) return '🟢';
    if (ms < 300) return '🟡';
    if (ms < 500) return '🟠';
    return '🔴';
  }

  getStats() {
    return {
      ...this.stats,
      avgTime: this.getAvgTime(),
    };
  }

  getBot(): Telegraf {
    return this.bot;
  }

  // Метод для ручной установки webhook (если нужно)
  async resetWebhook(): Promise<any> {
    await this.setupWebhook();
    return this.bot.telegram.getWebhookInfo();
  }
}