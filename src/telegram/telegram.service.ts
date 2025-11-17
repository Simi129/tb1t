import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);
  
  // Статистика для мониторинга
  private stats = {
    totalRequests: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
  };

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
      const webhookDomain = process.env.WEBHOOK_URL || 'tb1t.vercel.app';
      const webhookUrl = `https://${webhookDomain}/api/telegram`;
      
      this.logger.log(`🔧 Setting webhook to: ${webhookUrl}`);
      
      try {
        await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
        this.logger.log('✅ Old webhook deleted');
        
        const result = await this.bot.telegram.setWebhook(webhookUrl);
        this.logger.log(`✅ Webhook set successfully: ${result}`);
        
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
    const startTime = Date.now();
    
    try {
      // Логируем входящий запрос
      const updateType = this.getUpdateType(update);
      const userId = this.getUserId(update);
      
      this.logger.log(
        `📨 Incoming update: Type=${updateType}, User=${userId}, UpdateID=${update.update_id}`
      );
      
      // Обрабатываем обновление
      await this.bot.handleUpdate(update);
      
      // Вычисляем время обработки
      const processingTime = Date.now() - startTime;
      
      // Обновляем статистику
      this.updateStats(processingTime);
      
      // Логируем результат с цветовой индикацией
      const emoji = processingTime < 100 ? '🟢' : processingTime < 300 ? '🟡' : '🔴';
      this.logger.log(
        `${emoji} Update processed: ${processingTime}ms (avg: ${Math.round(this.stats.totalTime / this.stats.totalRequests)}ms, min: ${this.stats.minTime}ms, max: ${this.stats.maxTime}ms)`
      );
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error handling update (after ${processingTime}ms): ${error.message}`
      );
      throw error;
    }
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

  getStats() {
    return {
      ...this.stats,
      avgTime: this.stats.totalRequests > 0 
        ? Math.round(this.stats.totalTime / this.stats.totalRequests) 
        : 0,
    };
  }

  getBot(): Telegraf {
    return this.bot;
  }
}