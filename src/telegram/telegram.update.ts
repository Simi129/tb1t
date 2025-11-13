import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Update, Start, Help, On, Command } from 'nestjs-telegraf';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { DatabaseService } from '../database/database.service';
import { hasFrom, hasTextMessage } from './guards/context.guard';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private startCommand: StartCommand,
    private helpCommand: HelpCommand,
    private databaseService: DatabaseService,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    await this.startCommand.execute(ctx);
  }

  @Help()
  async onHelp(ctx: Context) {
    await this.helpCommand.execute(ctx);
  }

  @Command('profile')
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

  @On('text')
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