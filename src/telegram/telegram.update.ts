import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context } from 'telegraf';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from './telegram.service';
import { hasFrom, hasTextMessage } from './guards/context.guard';

// КРИТИЧНО: Убрали декоратор @Update() - он не работает без TelegrafModule!
@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private startCommand: StartCommand,
    private helpCommand: HelpCommand,
    private databaseService: DatabaseService,
    private telegramService: TelegramService, // ДОБАВЛЕНО: инжектим TelegramService
  ) {}

  // ДОБАВЛЕНО: Регистрируем все обработчики вручную при инициализации модуля
  onModuleInit() {
    const bot = this.telegramService.getBot();

    // Регистрация команды /start
    bot.start(async (ctx: Context) => {
      try {
        await this.onStart(ctx);
      } catch (error) {
        this.logger.error(`Error in /start: ${error.message}`);
      }
    });

    // Регистрация команды /help
    bot.help(async (ctx: Context) => {
      try {
        await this.onHelp(ctx);
      } catch (error) {
        this.logger.error(`Error in /help: ${error.message}`);
      }
    });

    // Регистрация команды /profile
    bot.command('profile', async (ctx: Context) => {
      try {
        await this.onProfile(ctx);
      } catch (error) {
        this.logger.error(`Error in /profile: ${error.message}`);
      }
    });

    // НОВАЯ КОМАНДА: /ping
    bot.command('ping', async (ctx: Context) => {
      try {
        await this.onPing(ctx);
      } catch (error) {
        this.logger.error(`Error in /ping: ${error.message}`);
      }
    });

    // НОВАЯ КОМАНДА: /status
    bot.command('status', async (ctx: Context) => {
      try {
        await this.onStatus(ctx);
      } catch (error) {
        this.logger.error(`Error in /status: ${error.message}`);
      }
    });

    // Регистрация обработчика текстовых сообщений
    bot.on('text', async (ctx: Context) => {
      try {
        await this.onText(ctx);
      } catch (error) {
        this.logger.error(`Error in text handler: ${error.message}`);
      }
    });

    this.logger.log('✅ Telegram command handlers registered');
  }

  // УБРАНЫ декораторы @Start(), @Help(), @Command(), @On() - они не нужны
  async onStart(ctx: Context) {
    await this.startCommand.execute(ctx);
  }

  async onHelp(ctx: Context) {
    await this.helpCommand.execute(ctx);
  }

  async onProfile(ctx: Context) {
    if (!hasFrom(ctx)) {
      await ctx.reply('Не удалось получить информацию о пользователе');
      return;
    }

    try {
      const user = await this.databaseService.getUser(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Пользователь не найден. Используйте /start');
        return;
      }

      await ctx.reply(
        `👤 Ваш профиль:\n\n` +
        `ID: ${user.telegram_id}\n` +
        `Username: @${user.username || 'не указан'}\n` +
        `Имя: ${user.first_name}\n` +
        `Последний визит: ${new Date(user.last_seen).toLocaleString('ru-RU')}`
      );
    } catch (error) {
      this.logger.error(`Error in profile command: ${error.message}`);
      await ctx.reply('Произошла ошибка при получении профиля.');
    }
  }

  // НОВЫЙ МЕТОД: команда /ping
  async onPing(ctx: Context) {
    const startTime = Date.now();
    
    try {
      // Отправляем первое сообщение
      const sentMessage = await ctx.reply('🏓 Pinging...');
      
      // Вычисляем задержку
      const latency = Date.now() - startTime;
      
      // Обновляем сообщение с результатом
      await ctx.telegram.editMessageText(
        ctx.chat?.id,
        sentMessage.message_id,
        undefined,
        `🏓 Pong!\n\n` +
        `⏱️ Задержка: ${latency}ms\n` +
        `📍 Регион: Vercel (Supabase)\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      );
      
      this.logger.log(`⏱️ /ping command: ${latency}ms`);
    } catch (error) {
      this.logger.error(`Error in /ping: ${error.message}`);
      await ctx.reply('❌ Ошибка при выполнении команды /ping');
    }
  }

  // НОВЫЙ МЕТОД: команда /status
  async onStatus(ctx: Context) {
    const overallStart = Date.now();
    
    try {
      // Отправляем начальное сообщение
      const message = await ctx.reply('⏳ Проверяю статус...');
      
      // 1. Проверяем задержку ответа бота
      const botLatency = Date.now() - overallStart;
      
      // 2. Проверяем задержку БД
      const dbStart = Date.now();
      await this.databaseService.getClient()
        .from('users')
        .select('count')
        .limit(1);
      const dbLatency = Date.now() - dbStart;
      
      // 3. Общее время
      const totalTime = Date.now() - overallStart;
      
      // Определяем качество соединения
      const getQuality = (ms: number) => {
        if (ms < 100) return '🟢 Отлично';
        if (ms < 300) return '🟡 Хорошо';
        if (ms < 500) return '🟠 Средне';
        return '🔴 Медленно';
      };
      
      // Получаем статистику
      const dbStats = this.databaseService.getStats();
      
      // Формируем отчёт
      const statusText = 
        `📊 **Статус системы**\n\n` +
        `🤖 **Бот (Telegram API)**\n` +
        `├ Задержка: ${botLatency}ms\n` +
        `└ Статус: ${getQuality(botLatency)}\n\n` +
        `💾 **База данных (Supabase)**\n` +
        `├ Задержка запроса: ${dbLatency}ms\n` +
        `├ Всего запросов: ${dbStats.queries}\n` +
        `├ Средняя задержка: ${dbStats.avgTime}ms\n` +
        `├ Мин/Макс: ${dbStats.minTime === Infinity ? 'N/A' : dbStats.minTime}/${dbStats.maxTime}ms\n` +
        `└ Статус: ${getQuality(dbLatency)}\n\n` +
        `⚡ **Общая производительность**\n` +
        `├ Полное время: ${totalTime}ms\n` +
        `└ Статус: ${getQuality(totalTime)}\n\n` +
        `📍 Сервер: Vercel (${process.env.VERCEL_REGION || 'unknown'})\n` +
        `🗄️ БД: Supabase\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
      
      // Обновляем сообщение
      await ctx.telegram.editMessageText(
        ctx.chat?.id,
        message.message_id,
        undefined,
        statusText,
        { parse_mode: 'Markdown' }
      );
      
      this.logger.log(`⏱️ /status command processed in ${totalTime}ms`);
      
    } catch (error: any) {
      this.logger.error(`Error in /status: ${error.message}`);
      await ctx.reply(`❌ Ошибка при проверке статуса:\n${error.message}`);
    }
  }

  async onText(ctx: Context) {
    if (!hasTextMessage(ctx)) {
      return;
    }

    const text = ctx.message.text;
    
    // Игнорируем команды
    if (text.startsWith('/')) {
      return;
    }

    const startTime = Date.now();

    try {
      // Сохраняем сообщение в БД
      const dbStart = Date.now();
      await this.databaseService.saveMessage(ctx.from.id, text);
      const dbTime = Date.now() - dbStart;

      await ctx.reply(
        `✅ Сообщение сохранено!\n\n` +
        `📝 Текст: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n` +
        `⏱️ Время сохранения: ${dbTime}ms`
      );

      const totalTime = Date.now() - startTime;
      this.logger.log(`⏱️ Message processing: DB=${dbTime}ms, Total=${totalTime}ms`);
    } catch (error) {
      this.logger.error(`Error processing text message: ${error.message}`);
      await ctx.reply('Произошла ошибка при обработке сообщения.');
    }
  }
}