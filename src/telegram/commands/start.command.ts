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
      
      const welcomeText = 
        `🔥 *ProspectTrade VIP*\n\n` +
        `Привет, ${firstName}\\! 👋\n\n` +
        `*Access\\. Precision\\. Excellence\\.*\n` +
        `✨ Handpicked trading opportunities\n` +
        `🔒 Private insights, unavailable to the public\n` +
        `🤝 Personal guidance from elite market experts\n\n` +
        `Membership is privilege\\.\n` +
        `Welcome to the next level\\. 🌍\n\n` +
        `📊 *Доступные команды:*\n` +
        `/help \\- Полная справка\n` +
        `/ping \\- Проверить задержку\n` +
        `/status \\- Диагностика системы\n` +
        `/imagine \\- Генерация изображений 🍌`;

      await ctx.reply(welcomeText, { parse_mode: 'MarkdownV2' });
      
      this.logger.log(`User ${telegramId} started the bot`);
    } catch (error) {
      this.logger.error(`Error in start command: ${error.message}`);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }
}