import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context } from 'telegraf';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from './telegram.service';
import { GeminiService } from '../ai/gemini.service';
import { hasFrom, hasTextMessage } from './guards/context.guard';

@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private startCommand: StartCommand,
    private helpCommand: HelpCommand,
    private databaseService: DatabaseService,
    private telegramService: TelegramService,
    private geminiService: GeminiService,
  ) {}

  onModuleInit() {
    const bot = this.telegramService.getBot();

    bot.start(async (ctx: Context) => {
      try {
        await this.onStart(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /start: ${error.message}`);
      }
    });

    bot.help(async (ctx: Context) => {
      try {
        await this.onHelp(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /help: ${error.message}`);
      }
    });

    bot.command('profile', async (ctx: Context) => {
      try {
        await this.onProfile(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /profile: ${error.message}`);
      }
    });

    bot.command('ping', async (ctx: Context) => {
      try {
        await this.onPing(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /ping: ${error.message}`);
      }
    });

    bot.command('status', async (ctx: Context) => {
      try {
        await this.onStatus(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /status: ${error.message}`);
      }
    });

    bot.command('imagine', async (ctx: Context) => {
      try {
        await this.onImagine(ctx);
      } catch (error: any) {
        this.logger.error(`Error in /imagine: ${error.message}`);
      }
    });

    bot.on('photo', async (ctx: Context) => {
      try {
        await this.onPhoto(ctx);
      } catch (error: any) {
        this.logger.error(`Error in photo handler: ${error.message}`);
      }
    });

    bot.on('voice', async (ctx: Context) => {
      try {
        await this.onVoice(ctx);
      } catch (error: any) {
        this.logger.error(`Error in voice handler: ${error.message}`);
      }
    });

    bot.on('audio', async (ctx: Context) => {
      try {
        await this.onAudio(ctx);
      } catch (error: any) {
        this.logger.error(`Error in audio handler: ${error.message}`);
      }
    });

    bot.on('video', async (ctx: Context) => {
      try {
        await this.onVideo(ctx);
      } catch (error: any) {
        this.logger.error(`Error in video handler: ${error.message}`);
      }
    });

    bot.on('text', async (ctx: Context) => {
      try {
        await this.onText(ctx);
      } catch (error: any) {
        this.logger.error(`Error in text handler: ${error.message}`);
      }
    });

    this.logger.log('✅ Telegram command handlers registered');
  }

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
    } catch (error: any) {
      this.logger.error(`Error in profile command: ${error.message}`);
      await ctx.reply('Произошла ошибка при получении профиля.');
    }
  }

  async onPing(ctx: Context) {
    const startTime = Date.now();
    
    try {
      const sentMessage = await ctx.reply('🏓 Pinging...');
      const latency = Date.now() - startTime;
      
      // Проверка на существование chat
      if (!ctx.chat) {
        await ctx.reply('❌ Не удалось определить чат');
        return;
      }
      
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        sentMessage.message_id,
        undefined,
        `🏓 Pong!\n\n` +
        `⏱️ Задержка: ${latency}ms\n` +
        `📍 Регион: Vercel (Supabase)\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      );
      
      this.logger.log(`⏱️ /ping command: ${latency}ms`);
    } catch (error: any) {
      this.logger.error(`Error in /ping: ${error.message}`);
      await ctx.reply('❌ Ошибка при выполнении команды /ping');
    }
  }

  async onStatus(ctx: Context) {
    const overallStart = Date.now();
    
    try {
      const message = await ctx.reply('⏳ Проверяю статус...');
      
      const botLatency = Date.now() - overallStart;
      
      const dbStart = Date.now();
      await this.databaseService.getClient()
        .from('users')
        .select('count')
        .limit(1);
      const dbLatency = Date.now() - dbStart;
      
      const totalTime = Date.now() - overallStart;
      
      const getQuality = (ms: number) => {
        if (ms < 100) return '🟢 Отлично';
        if (ms < 300) return '🟡 Хорошо';
        if (ms < 500) return '🟠 Средне';
        return '🔴 Медленно';
      };
      
      const dbStats = this.databaseService.getStats();
      
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
        `🤖 AI: Gemini 1.5 Flash + 2.5 Flash Image 🍌\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
      
      // Проверка на существование chat
      if (!ctx.chat) {
        await ctx.reply('❌ Не удалось определить чат');
        return;
      }
      
      await ctx.telegram.editMessageText(
        ctx.chat.id,
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

  async onImagine(ctx: Context) {
    // Проверка на существование message
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Не удалось получить текст команды');
      return;
    }

    const messageText = ctx.message.text;
    const prompt = messageText.replace('/imagine', '').trim();

    if (!prompt) {
      await ctx.reply(
        '🍌 *Nano Banana Image Generator*\n\n' +
        'Используй команду так:\n' +
        '`/imagine опиши что ты хочешь увидеть`\n\n' +
        '*Примеры:*\n' +
        '• `/imagine красивый закат над океаном с пальмами`\n' +
        '• `/imagine футуристический город в стиле киберпанк`\n' +
        '• `/imagine милый котёнок играет с клубком`\n\n' +
        '💰 Стоимость: ~$0.039 за изображение',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const startTime = Date.now();
    const statusMessage = await ctx.reply('🍌 Генерирую изображение...');

    try {
      const aiStart = Date.now();
      const imageBuffer = await this.geminiService.generateImage(prompt);
      const aiTime = Date.now() - aiStart;

      await ctx.replyWithPhoto(
        { source: imageBuffer },
        {
          caption: 
            `🍌 *Nano Banana*\n\n` +
            `📝 Промпт: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
            `⏱️ Время: ${aiTime}ms\n` +
            `💰 Стоимость: ~$0.039`,
          parse_mode: 'Markdown',
        }
      );

      // Проверка на существование chat
      if (ctx.chat) {
        await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);
      }

      this.logger.log(`⏱️ Image generation: AI=${aiTime}ms, Total=${Date.now() - startTime}ms`);
    } catch (error: any) {
      this.logger.error(`Error generating image: ${error.message}`);
      
      // Проверка на существование chat
      if (ctx.chat) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          undefined,
          '❌ Ошибка при генерации изображения. Попробуй другой промпт или повтори позже.'
        );
      }
    }
  }

  async onPhoto(ctx: Context) {
    // Проверка на существование message и photo
    if (!ctx.message || !('photo' in ctx.message)) {
      return;
    }

    const startTime = Date.now();
    
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
    
    const caption = 'caption' in ctx.message ? ctx.message.caption : undefined;

    if (!caption) {
      // Анализ изображения
      await ctx.reply('🖼️ Анализирую изображение...');

      try {
        const aiStart = Date.now();
        const analysis = await this.geminiService.analyzeImage(
          fileLink.href, 
          'Опиши это изображение подробно'
        );
        const aiTime = Date.now() - aiStart;
        
        const totalTime = Date.now() - startTime;
        
        await ctx.reply(
          `🤖 *Результат анализа:*\n\n${analysis}\n\n` +
          `⏱️ Время: ${aiTime}ms\n\n` +
          `💡 *Подсказка:* Отправь фото с подписью, чтобы отредактировать его через Nano Banana! 🍌`,
          { parse_mode: 'Markdown' }
        );
        
        this.logger.log(`⏱️ Photo analysis: AI=${aiTime}ms, Total=${totalTime}ms`);
      } catch (error: any) {
        this.logger.error(`Error analyzing photo: ${error.message}`);
        await ctx.reply('❌ Ошибка при анализе изображения');
      }
    } else {
      // Редактирование изображения через Nano Banana
      const statusMessage = await ctx.reply('🍌 Редактирую изображение...');

      try {
        const aiStart = Date.now();
        const editedImageBuffer = await this.geminiService.editImage(
          fileLink.href,
          caption
        );
        const aiTime = Date.now() - aiStart;

        await ctx.replyWithPhoto(
          { source: editedImageBuffer },
          {
            caption: 
              `🍌 *Nano Banana Edit*\n\n` +
              `📝 Инструкция: "${caption.substring(0, 100)}${caption.length > 100 ? '...' : ''}"\n\n` +
              `⏱️ Время: ${aiTime}ms\n` +
              `💰 Стоимость: ~$0.039`,
            parse_mode: 'Markdown',
          }
        );

        // Проверка на существование chat
        if (ctx.chat) {
          await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);
        }

        this.logger.log(`⏱️ Image editing: AI=${aiTime}ms, Total=${Date.now() - startTime}ms`);
      } catch (error: any) {
        this.logger.error(`Error editing image: ${error.message}`);
        
        // Проверка на существование chat
        if (ctx.chat) {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMessage.message_id,
            undefined,
            '❌ Ошибка при редактировании изображения'
          );
        }
      }
    }
  }

  async onVoice(ctx: Context) {
    // Проверка на существование message и voice
    if (!ctx.message || !('voice' in ctx.message)) {
      return;
    }

    const startTime = Date.now();
    await ctx.reply('🎤 Обрабатываю голосовое сообщение...');

    try {
      const voice = ctx.message.voice;
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      
      const aiStart = Date.now();
      const transcription = await this.geminiService.analyzeAudio(fileLink.href);
      const aiTime = Date.now() - aiStart;
      
      const totalTime = Date.now() - startTime;
      
      await ctx.reply(
        `🎤 *Расшифровка:*\n\n${transcription}\n\n` +
        `⏱️ Время: ${aiTime}ms`,
        { parse_mode: 'Markdown' }
      );
      
      this.logger.log(`⏱️ Voice analysis: AI=${aiTime}ms, Total=${totalTime}ms`);
    } catch (error: any) {
      this.logger.error(`Error analyzing voice: ${error.message}`);
      await ctx.reply('❌ Ошибка при обработке голосового сообщения');
    }
  }

  async onAudio(ctx: Context) {
    // Проверка на существование message и audio
    if (!ctx.message || !('audio' in ctx.message)) {
      return;
    }

    const startTime = Date.now();
    await ctx.reply('🎵 Анализирую аудио...');

    try {
      const audio = ctx.message.audio;
      const fileLink = await ctx.telegram.getFileLink(audio.file_id);
      
      const aiStart = Date.now();
      const analysis = await this.geminiService.analyzeAudio(fileLink.href);
      const aiTime = Date.now() - aiStart;
      
      const totalTime = Date.now() - startTime;
      
      await ctx.reply(
        `🎵 *Анализ аудио:*\n\n${analysis}\n\n` +
        `⏱️ Время: ${aiTime}ms`,
        { parse_mode: 'Markdown' }
      );
      
      this.logger.log(`⏱️ Audio analysis: AI=${aiTime}ms, Total=${totalTime}ms`);
    } catch (error: any) {
      this.logger.error(`Error analyzing audio: ${error.message}`);
      await ctx.reply('❌ Ошибка при анализе аудио');
    }
  }

  async onVideo(ctx: Context) {
    // Проверка на существование message и video
    if (!ctx.message || !('video' in ctx.message)) {
      return;
    }

    const startTime = Date.now();
    await ctx.reply('🎬 Анализирую видео...');

    try {
      const video = ctx.message.video;
      const fileLink = await ctx.telegram.getFileLink(video.file_id);
      
      const caption = 'caption' in ctx.message ? ctx.message.caption : undefined;
      const prompt = caption || 'Опиши содержание этого видео';
      
      const aiStart = Date.now();
      const analysis = await this.geminiService.analyzeVideo(fileLink.href, prompt);
      const aiTime = Date.now() - aiStart;
      
      const totalTime = Date.now() - startTime;
      
      await ctx.reply(
        `🎬 *Анализ видео:*\n\n${analysis}\n\n` +
        `⏱️ Время: ${aiTime}ms`,
        { parse_mode: 'Markdown' }
      );
      
      this.logger.log(`⏱️ Video analysis: AI=${aiTime}ms, Total=${totalTime}ms`);
    } catch (error: any) {
      this.logger.error(`Error analyzing video: ${error.message}`);
      await ctx.reply('❌ Ошибка при анализе видео');
    }
  }

  async onText(ctx: Context) {
    if (!hasTextMessage(ctx)) {
      return;
    }

    const text = ctx.message.text;
    
    if (text.startsWith('/')) {
      return;
    }

    const startTime = Date.now();

    try {
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
    } catch (error: any) {
      this.logger.error(`Error processing text message: ${error.message}`);
      await ctx.reply('Произошла ошибка при обработке сообщения.');
    }
  }
}