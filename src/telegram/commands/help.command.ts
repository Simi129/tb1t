import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class HelpCommand {
  async execute(ctx: Context) {
    await ctx.reply(
      `📋 Доступные команды:\n\n` +
      `/start - Начать работу с ботом\n` +
      `/help - Показать это сообщение\n` +
      `/profile - Показать ваш профиль`
    );
  }
}