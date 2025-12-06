import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { DatabaseService } from '../../database/database.service';
import { TelegramService } from '../telegram.service';
import {
  BroadcastOptions,
  BroadcastResult,
  BroadcastError,
} from './broadcast.types';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private readonly RATE_LIMIT_DELAY = 35; // ms между сообщениями (безопасно для Telegram)
  private readonly BATCH_SIZE = 100; // размер батча для обработки
  private bot: Telegraf;

  constructor(
    private databaseService: DatabaseService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {
    this.bot = this.telegramService.getBot();
  }

  /**
   * Главный метод для отправки рассылки
   */
  async sendBroadcast(options: BroadcastOptions): Promise<BroadcastResult> {
    const startTime = Date.now();
    this.logger.log(`🚀 Запуск рассылки: segment=${options.targetSegment || 'all'}`);

    // Получаем целевую аудиторию
    const users = await this.getTargetUsers(options.targetSegment);
    this.logger.log(`👥 Найдено пользователей: ${users.length}`);

    const result: BroadcastResult = {
      totalUsers: users.length,
      successful: 0,
      failed: 0,
      blocked: 0,
      duration: 0,
      errors: [],
    };

    // Создаем запись о рассылке в БД
    const broadcastId = await this.createBroadcastRecord(options, users.length);

    // Обрабатываем пользователей батчами
    for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
      const batch = users.slice(i, i + this.BATCH_SIZE);
      await this.processBatch(batch, options, result, broadcastId);
      
      // Логируем прогресс
      const progress = Math.round(((i + batch.length) / users.length) * 100);
      this.logger.log(`📊 Прогресс: ${progress}% (${i + batch.length}/${users.length})`);
    }

    result.duration = Date.now() - startTime;

    // Обновляем статистику рассылки
    await this.updateBroadcastStats(broadcastId, result);

    this.logger.log(
      `✅ Рассылка завершена за ${Math.round(result.duration / 1000)}с: ` +
      `✓${result.successful} ✗${result.failed} 🚫${result.blocked}`
    );

    return result;
  }

  /**
   * Обработка одного батча пользователей
   */
  private async processBatch(
    users: any[],
    options: BroadcastOptions,
    result: BroadcastResult,
    broadcastId: string,
  ): Promise<void> {
    for (const user of users) {
      try {
        await this.sendToUser(user.telegram_id, options);
        result.successful++;
        
        // Задержка для соблюдения rate limit
        await this.delay(this.RATE_LIMIT_DELAY);
        
      } catch (error: any) {
        this.logger.debug(`❌ Ошибка для пользователя ${user.telegram_id}: ${error.message}`);
        
        // Обрабатываем разные типы ошибок
        if (error.response?.error_code === 403) {
          // Пользователь заблокировал бота
          result.blocked++;
          await this.markUserAsBlocked(user.telegram_id);
        } else {
          result.failed++;
          result.errors.push({
            userId: user.telegram_id,
            error: error.message,
          });
        }
      }
    }
  }

  /**
   * Отправка сообщения одному пользователю
   */
  private async sendToUser(chatId: number, options: BroadcastOptions): Promise<void> {
    const extra: any = {};

    // Настраиваем parse mode
    if (options.parseMode) {
      extra.parse_mode = options.parseMode;
    }

    // Добавляем кнопки если есть
    if (options.buttons && options.buttons.length > 0) {
      const keyboard = options.buttons.map(row => 
        row.map(btn => {
          if (btn.url) {
            return Markup.button.url(btn.text, btn.url);
          } else if (btn.callback_data) {
            return Markup.button.callback(btn.text, btn.callback_data);
          }
          // Если нет ни url ни callback_data - создаём callback кнопку с текстом
          return Markup.button.callback(btn.text, `action_${btn.text}`);
        })
      );
      extra.reply_markup = Markup.inlineKeyboard(keyboard).reply_markup;
    }

    // Отправляем в зависимости от типа контента
    if (options.imageUrl) {
      await this.bot.telegram.sendPhoto(chatId, options.imageUrl, {
        caption: options.message,
        ...extra,
      });
    } else if (options.videoUrl) {
      await this.bot.telegram.sendVideo(chatId, options.videoUrl, {
        caption: options.message,
        ...extra,
      });
    } else {
      await this.bot.telegram.sendMessage(chatId, options.message, extra);
    }
  }

  /**
   * Получение целевой аудитории
   */
  private async getTargetUsers(segment?: string): Promise<any[]> {
    try {
      let query = this.databaseService
        .getClient()
        .from('users')
        .select('telegram_id, username, first_name')
        .eq('is_blocked', false); // Не отправляем заблокировавшим бота

      // Фильтруем по сегменту
      if (segment === 'subscribed') {
        // Только с активной подпиской
        const { data: subscribedUsers } = await this.databaseService
          .getClient()
          .from('subscriptions')
          .select('user_id')
          .eq('is_active', true);
        
        const userIds = subscribedUsers?.map(s => s.user_id) || [];
        query = query.in('telegram_id', userIds);
        
      } else if (segment === 'free') {
        // Только без активной подписки
        const { data: subscribedUsers } = await this.databaseService
          .getClient()
          .from('subscriptions')
          .select('user_id')
          .eq('is_active', true);
        
        const userIds = subscribedUsers?.map(s => s.user_id) || [];
        query = query.not('telegram_id', 'in', `(${userIds.join(',')})`);
        
      } else if (segment === 'premium') {
        // Только с premium подпиской
        const { data: premiumUsers } = await this.databaseService
          .getClient()
          .from('subscriptions')
          .select('user_id')
          .eq('is_active', true)
          .in('plan_id', ['pro', 'premium']);
        
        const userIds = premiumUsers?.map(s => s.user_id) || [];
        query = query.in('telegram_id', userIds);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Ошибка получения пользователей: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error: any) {
      this.logger.error(`Ошибка фильтрации пользователей: ${error.message}`);
      return [];
    }
  }

  /**
   * Создание записи о рассылке
   */
  private async createBroadcastRecord(
    options: BroadcastOptions,
    targetCount: number,
  ): Promise<string> {
    try {
      const { data, error } = await this.databaseService
        .getClient()
        .from('broadcasts')
        .insert({
          message: options.message,
          target_segment: options.targetSegment || 'all',
          target_count: targetCount,
          status: 'in_progress',
          scheduled_for: options.scheduledFor?.toISOString() || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      this.logger.error(`Ошибка создания записи рассылки: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Обновление статистики рассылки
   */
  private async updateBroadcastStats(
    broadcastId: string,
    result: BroadcastResult,
  ): Promise<void> {
    try {
      await this.databaseService
        .getClient()
        .from('broadcasts')
        .update({
          successful_count: result.successful,
          failed_count: result.failed,
          blocked_count: result.blocked,
          duration_ms: result.duration,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', broadcastId);
    } catch (error: any) {
      this.logger.error(`Ошибка обновления статистики: ${error.message}`);
    }
  }

  /**
   * Пометить пользователя как заблокировавшего бота
   */
  private async markUserAsBlocked(telegramId: number): Promise<void> {
    try {
      await this.databaseService
        .getClient()
        .from('users')
        .update({ is_blocked: true, blocked_at: new Date().toISOString() })
        .eq('telegram_id', telegramId);
      
      this.logger.debug(`🚫 Пользователь ${telegramId} помечен как заблокировавший бота`);
    } catch (error: any) {
      this.logger.error(`Ошибка обновления статуса блокировки: ${error.message}`);
    }
  }

  /**
   * Получить историю рассылок
   */
  async getBroadcastHistory(limit = 10): Promise<any[]> {
    try {
      const { data, error } = await this.databaseService
        .getClient()
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      this.logger.error(`Ошибка получения истории: ${error.message}`);
      return [];
    }
  }

  /**
   * Получить статистику рассылки по ID
   */
  async getBroadcastStats(broadcastId: string): Promise<any> {
    try {
      const { data, error } = await this.databaseService
        .getClient()
        .from('broadcasts')
        .select('*')
        .eq('id', broadcastId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      this.logger.error(`Ошибка получения статистики: ${error.message}`);
      return null;
    }
  }

  /**
   * Утилита - задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Тестовая рассылка (только админам)
   */
  async sendTestBroadcast(adminIds: number[], options: BroadcastOptions): Promise<void> {
    this.logger.log(`🧪 Тестовая рассылка для ${adminIds.length} админов`);
    
    for (const adminId of adminIds) {
      try {
        await this.sendToUser(adminId, options);
        this.logger.log(`✅ Отправлено админу ${adminId}`);
      } catch (error: any) {
        this.logger.error(`❌ Ошибка отправки админу ${adminId}: ${error.message}`);
      }
    }
  }
}