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

  async onText(ctx: Context) {
    if (!hasTextMessage(ctx)) {
      return;
    }

    const text = ctx.message.text;
    
    // Игнорируем команды
    if (text.startsWith('/')) {
      return;
    }

    try {
      await this.databaseService.saveMessage(ctx.from.id, text);
      await ctx.reply(`Вы написали: ${text}`);
    } catch (error) {
      this.logger.error(`Error processing text message: ${error.message}`);
      await ctx.reply('Произошла ошибка при обработке сообщения.');
    }
  }
}