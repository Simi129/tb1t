import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class StartCommand {
  private readonly logger = new Logger(StartCommand.name);

  constructor(private databaseService: DatabaseService) {}

  async execute(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply('Не удалось получить информацию о пользователе');
      return;
    }

    const telegramId = ctx.from.id;
    const username = ctx.from.username || '';
    const firstName = ctx.from.first_name || 'Пользователь';

    try {
      await this.databaseService.saveUser(telegramId, username, firstName);
      
      await ctx.reply(
        `Привет, ${firstName}! 👋\n\n` +
        `Добро пожаловать в бота!\n` +
        `Используй /help для списка команд.`
      );
      
      this.logger.log(`User ${telegramId} started the bot`);
    } catch (error) {
      this.logger.error(`Error in start command: ${error.message}`);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }
}