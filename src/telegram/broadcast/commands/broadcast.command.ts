import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { BroadcastService } from '../broadcast.service';
import { Markup } from 'telegraf';

@Injectable()
export class BroadcastCommand {
  private readonly logger = new Logger(BroadcastCommand.name);
  private readonly ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map(Number) || [];

  constructor(private broadcastService: BroadcastService) {}

  /**
   * Проверка, является ли пользователь админом
   */
  private isAdmin(userId: number): boolean {
    return this.ADMIN_IDS.includes(userId);
  }

  /**
   * Команда /broadcast - показать меню рассылок
   */
  async handleBroadcastCommand(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId || !this.isAdmin(userId)) {
      await ctx.reply('❌ У вас нет доступа к этой команде');
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Новая рассылка', 'broadcast_new')],
      [Markup.button.callback('📊 История рассылок', 'broadcast_history')],
      [Markup.button.callback('🧪 Тестовая рассылка', 'broadcast_test')],
    ]);

    await ctx.reply(
      '📡 *Панель управления рассылками*\n\n' +
      'Выберите действие:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      }
    );
  }

  /**
   * Обработка кнопки "История рассылок"
   */
  async handleHistoryCallback(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId || !this.isAdmin(userId)) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    await ctx.answerCbQuery();

    const history = await this.broadcastService.getBroadcastHistory(5);

    if (history.length === 0) {
      await ctx.editMessageText('📭 История рассылок пуста');
      return;
    }

    let message = '📊 *История последних рассылок:*\n\n';

    history.forEach((broadcast, index) => {
      const date = new Date(broadcast.created_at).toLocaleString('ru-RU');
      const status = broadcast.status === 'completed' ? '✅' : '⏳';
      
      message += `${index + 1}. ${status} ${date}\n`;
      message += `   Сегмент: ${broadcast.target_segment}\n`;
      message += `   Отправлено: ${broadcast.successful_count || 0}/${broadcast.target_count}\n`;
      
      if (broadcast.failed_count > 0) {
        message += `   Ошибки: ${broadcast.failed_count}\n`;
      }
      if (broadcast.blocked_count > 0) {
        message += `   Заблокировали: ${broadcast.blocked_count}\n`;
      }
      
      message += '\n';
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('◀️ Назад', 'broadcast_menu')],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  }

  /**
   * Обработка кнопки "Назад в меню"
   */
  async handleMenuCallback(ctx: Context): Promise<void> {
    await ctx.answerCbQuery();
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Новая рассылка', 'broadcast_new')],
      [Markup.button.callback('📊 История рассылок', 'broadcast_history')],
      [Markup.button.callback('🧪 Тестовая рассылка', 'broadcast_test')],
    ]);

    await ctx.editMessageText(
      '📡 *Панель управления рассылками*\n\n' +
      'Выберите действие:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      }
    );
  }

  /**
   * Быстрая рассылка через команду
   * Использование: /broadcast_quick <сегмент> <сообщение>
   * Пример: /broadcast_quick all Привет всем!
   */
  async handleQuickBroadcast(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId || !this.isAdmin(userId)) {
      await ctx.reply('❌ У вас нет доступа к этой команде');
      return;
    }

    // Парсим аргументы команды
    const text = (ctx as any).message?.text || '';
    const args = text.split(' ').slice(1);
    
    if (args.length < 2) {
      await ctx.reply(
        '❌ Неверный формат команды\n\n' +
        '*Использование:*\n' +
        '`/broadcast_quick <сегмент> <сообщение>`\n\n' +
        '*Сегменты:*\n' +
        '• `all` - все пользователи\n' +
        '• `subscribed` - с подпиской\n' +
        '• `free` - без подписки\n' +
        '• `premium` - premium подписчики\n\n' +
        '*Пример:*\n' +
        '`/broadcast_quick all Привет всем! 👋`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const segment = args[0] as 'all' | 'subscribed' | 'free' | 'premium';
    const message = args.slice(1).join(' ');

    if (!['all', 'subscribed', 'free', 'premium'].includes(segment)) {
      await ctx.reply('❌ Неверный сегмент. Используйте: all, subscribed, free, premium');
      return;
    }

    // Подтверждение
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Отправить', `broadcast_confirm_${segment}`),
        Markup.button.callback('❌ Отмена', 'broadcast_cancel'),
      ],
    ]);

    await ctx.reply(
      `📢 *Подтверждение рассылки*\n\n` +
      `*Сегмент:* ${segment}\n` +
      `*Сообщение:*\n${message}\n\n` +
      `⚠️ Вы уверены?`,
      {
        parse_mode: 'Markdown',
        ...keyboard,
      }
    );

    // Сохраняем данные в контекст (в реальном проекте лучше использовать Redis/sessions)
    (ctx as any).session = {
      ...((ctx as any).session || {}),
      broadcastMessage: message,
    };
  }

  /**
   * Обработка подтверждения рассылки
   */
  async handleConfirmCallback(ctx: Context, segment: string): Promise<void> {
    await ctx.answerCbQuery('⏳ Запускаю рассылку...');

    const message = ((ctx as any).session?.broadcastMessage) || 'Тестовое сообщение';

    try {
      await ctx.editMessageText('⏳ Рассылка запущена, ожидайте...');

      const result = await this.broadcastService.sendBroadcast({
        message,
        targetSegment: segment as any,
        parseMode: 'HTML',
      });

      const stats = 
        `✅ *Рассылка завершена!*\n\n` +
        `📊 Статистика:\n` +
        `• Всего пользователей: ${result.totalUsers}\n` +
        `• Успешно: ${result.successful}\n` +
        `• Ошибки: ${result.failed}\n` +
        `• Заблокировали: ${result.blocked}\n` +
        `• Время: ${Math.round(result.duration / 1000)}с`;

      await ctx.editMessageText(stats, { parse_mode: 'Markdown' });
    } catch (error: any) {
      this.logger.error(`Ошибка рассылки: ${error.message}`);
      await ctx.editMessageText(`❌ Ошибка рассылки: ${error.message}`);
    }
  }

  /**
   * Отмена рассылки
   */
  async handleCancelCallback(ctx: Context): Promise<void> {
    await ctx.answerCbQuery('✅ Отменено');
    await ctx.editMessageText('❌ Рассылка отменена');
  }
}