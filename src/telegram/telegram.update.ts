import { 
  Update, 
  Ctx, 
  Start, 
  Command, 
  On, 
  Hears,
} from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Injectable, Logger } from '@nestjs/common';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { SubscriptionCommand } from './commands/subscription.command';
import { GeminiService } from '../ai/gemini.service';
import { DatabaseService } from '../database/database.service';
import { 
  KEYBOARD_BUTTONS, 
  mainKeyboard, 
  geminiKeyboard, 
  videoKeyboard, 
  audioKeyboard 
} from './keyboard.config';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);
  
  // Для отслеживания состояния пользователей
  private userStates = new Map<number, string>();

  constructor(
    private readonly startCommand: StartCommand,
    private readonly helpCommand: HelpCommand,
    private readonly subscriptionCommand: SubscriptionCommand,
    private readonly geminiService: GeminiService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.startCommand.execute(ctx);
  }

  @Command('help')
  async onHelp(@Ctx() ctx: Context) {
    await this.helpCommand.execute(ctx);
  }

  @Command('subscription')
  async onSubscription(@Ctx() ctx: Context) {
    await this.subscriptionCommand.execute(ctx);
  }

  // ============================================
  // 🎹 ОБРАБОТЧИКИ ГЛАВНОГО МЕНЮ
  // ============================================

  @Hears(KEYBOARD_BUTTONS.PROFILE)
  async onProfile(@Ctx() ctx: Context) {
    if (!ctx.from) return;

    try {
      const user = await this.databaseService.getUser(ctx.from.id);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден', mainKeyboard);
        return;
      }

      const profileText = 
        `👤 *Ваш профиль*\n\n` +
        `🆔 Telegram ID: \`${user.telegram_id}\`\n` +
        `👤 Имя: ${user.first_name}\n` +
        `📝 Username: @${user.username || 'не указан'}\n` +
        `📅 Последняя активность: ${new Date(user.last_seen).toLocaleString('ru-RU')}`;

      await ctx.reply(profileText, { 
        parse_mode: 'Markdown',
        ...mainKeyboard
      });
    } catch (error) {
      this.logger.error(`Error in profile: ${error.message}`);
      await ctx.reply('❌ Ошибка при получении профиля', mainKeyboard);
    }
  }

  @Hears(KEYBOARD_BUTTONS.GEMINI)
  async onGemini(@Ctx() ctx: Context) {
    const text = 
      `🤖 *Gemini AI*\n\n` +
      `Выберите действие:\n` +
      `💬 Чат - общение с ИИ\n` +
      `🔍 Анализ изображения - описание картинок`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...geminiKeyboard
    });
  }

  @Hears(KEYBOARD_BUTTONS.VIDEO_AI)
  async onVideoAI(@Ctx() ctx: Context) {
    const text = 
      `🎬 *Видео с ИИ*\n\n` +
      `🎥 Отправьте видео для анализа содержания`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...videoKeyboard
    });
  }

  @Hears(KEYBOARD_BUTTONS.AUDIO_AI)
  async onAudioAI(@Ctx() ctx: Context) {
    const text = 
      `🎙 *Аудио с ИИ*\n\n` +
      `📝 Транскрибация - перевод речи в текст\n` +
      `🎧 Анализ - описание содержания аудио`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...audioKeyboard
    });
  }

  @Hears(KEYBOARD_BUTTONS.IMAGE_AI)
  async onImageAI(@Ctx() ctx: Context) {
    const text = 
      `🖼 *Генерация изображений*\n\n` +
      `🍌 Используйте команду:\n` +
      `\`/imagine ваше описание\`\n\n` +
      `Например:\n` +
      `\`/imagine кот-космонавт в открытом космосе\``;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...mainKeyboard
    });
  }

  @Hears(KEYBOARD_BUTTONS.HELP)
  async onHelpButton(@Ctx() ctx: Context) {
    await this.helpCommand.execute(ctx);
  }

  // ============================================
  // 🤖 ОБРАБОТЧИКИ GEMINI ПОДМЕНЮ
  // ============================================

  @Hears(KEYBOARD_BUTTONS.GEMINI_CHAT)
  async onGeminiChat(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'gemini_chat');
    
    await ctx.reply(
      '💬 *Режим чата с Gemini активирован*\n\n' +
      'Просто напишите ваш вопрос, и я отвечу! ✨\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...geminiKeyboard
      }
    );
  }

  @Hears(KEYBOARD_BUTTONS.GEMINI_ANALYZE_IMAGE)
  async onGeminiAnalyzeImage(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'gemini_analyze_image');
    
    await ctx.reply(
      '🔍 *Режим анализа изображений*\n\n' +
      'Отправьте фото, и я его опишу! 📸\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...geminiKeyboard
      }
    );
  }

  @Hears(KEYBOARD_BUTTONS.GEMINI_BACK)
  async onGeminiBack(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 🎥 ОБРАБОТЧИКИ ВИДЕО ПОДМЕНЮ
  // ============================================

  @Hears(KEYBOARD_BUTTONS.VIDEO_ANALYZE)
  async onVideoAnalyze(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'video_analyze');
    
    await ctx.reply(
      '🎥 *Режим анализа видео*\n\n' +
      'Отправьте видео, и я расскажу что на нём! 🎬\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...videoKeyboard
      }
    );
  }

  @Hears(KEYBOARD_BUTTONS.VIDEO_BACK)
  async onVideoBack(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 🎙 ОБРАБОТЧИКИ АУДИО ПОДМЕНЮ
  // ============================================

  @Hears(KEYBOARD_BUTTONS.AUDIO_TRANSCRIBE)
  async onAudioTranscribe(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'audio_transcribe');
    
    await ctx.reply(
      '📝 *Режим транскрибации*\n\n' +
      'Отправьте голосовое сообщение или аудио файл! 🎤\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...audioKeyboard
      }
    );
  }

  @Hears(KEYBOARD_BUTTONS.AUDIO_ANALYZE)
  async onAudioAnalyze(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'audio_analyze');
    
    await ctx.reply(
      '🎧 *Режим анализа аудио*\n\n' +
      'Отправьте аудио для детального анализа! 🎵\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...audioKeyboard
      }
    );
  }

  @Hears(KEYBOARD_BUTTONS.AUDIO_BACK)
  async onAudioBack(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 🖼 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ (NANO BANANA)
  // ============================================

  @Command('imagine')
  async onImagine(@Ctx() ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const prompt = ctx.message.text.replace('/imagine', '').trim();

    if (!prompt) {
      await ctx.reply(
        '🍌 Укажите описание изображения!\n\n' +
        'Пример: `/imagine кот-космонавт в открытом космосе`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      await ctx.reply('🍌 Генерирую изображение... ⏳');

      const imageBuffer = await this.geminiService.generateImage(prompt);

      await ctx.replyWithPhoto(
        { source: imageBuffer },
        { 
          caption: `🎨 Готово!\n\n📝 Промпт: ${prompt}`,
          ...mainKeyboard
        }
      );

      this.logger.log(`Image generated for user ${ctx.from?.id}`);
    } catch (error) {
      this.logger.error(`Error generating image: ${error.message}`);
      await ctx.reply(
        '❌ Ошибка при генерации изображения. Попробуйте еще раз.',
        mainKeyboard
      );
    }
  }

  // ============================================
  // 📥 ОБРАБОТКА МЕДИА ФАЙЛОВ
  // ============================================

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);

    // Если пользователь в режиме анализа изображений
    if (userState === 'gemini_analyze_image') {
      try {
        await ctx.reply('🔍 Анализирую изображение... ⏳');

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);

        const analysis = await this.geminiService.analyzeImage(
          fileLink.href,
          'Подробно опиши это изображение'
        );

        await ctx.reply(`🔍 *Анализ изображения:*\n\n${analysis}`, {
          parse_mode: 'Markdown',
          ...geminiKeyboard
        });

        this.logger.log(`Image analyzed for user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error analyzing image: ${error.message}`);
        await ctx.reply('❌ Ошибка при анализе изображения', geminiKeyboard);
      }
    } else {
      await ctx.reply(
        'Для анализа изображений перейдите в:\n🤖 Gemini AI → 🔍 Анализ изображения',
        mainKeyboard
      );
    }
  }

  @On('voice')
  async onVoice(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message || !('voice' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);

    if (userState === 'audio_transcribe' || userState === 'audio_analyze') {
      try {
        await ctx.reply('🎙 Обрабатываю аудио... ⏳');

        const voice = ctx.message.voice;
        const fileLink = await ctx.telegram.getFileLink(voice.file_id);

        const prompt = userState === 'audio_transcribe' 
          ? 'Расшифруй это голосовое сообщение в текст'
          : 'Проанализируй содержание этого аудио, опиши тон, настроение и основные моменты';

        const result = await this.geminiService.analyzeAudio(
          fileLink.href,
          prompt
        );

        const emoji = userState === 'audio_transcribe' ? '📝' : '🎧';
        await ctx.reply(`${emoji} *Результат:*\n\n${result}`, {
          parse_mode: 'Markdown',
          ...audioKeyboard
        });

        this.logger.log(`Voice processed for user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error processing voice: ${error.message}`);
        await ctx.reply('❌ Ошибка при обработке аудио', audioKeyboard);
      }
    } else {
      await ctx.reply(
        'Для работы с аудио перейдите в:\n🎙 Аудио с ИИ',
        mainKeyboard
      );
    }
  }

  @On('video')
  async onVideo(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message || !('video' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);

    if (userState === 'video_analyze') {
      try {
        await ctx.reply('🎬 Анализирую видео... ⏳');

        const video = ctx.message.video;
        const fileLink = await ctx.telegram.getFileLink(video.file_id);

        const analysis = await this.geminiService.analyzeVideo(
          fileLink.href,
          'Опиши содержание этого видео подробно'
        );

        await ctx.reply(`🎬 *Анализ видео:*\n\n${analysis}`, {
          parse_mode: 'Markdown',
          ...videoKeyboard
        });

        this.logger.log(`Video analyzed for user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error analyzing video: ${error.message}`);
        await ctx.reply('❌ Ошибка при анализе видео', videoKeyboard);
      }
    } else {
      await ctx.reply(
        'Для анализа видео перейдите в:\n🎬 Видео с ИИ',
        mainKeyboard
      );
    }
  }

  // ============================================
  // 💬 ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
  // ============================================

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);
    const text = ctx.message.text;

    // Если пользователь в режиме чата с Gemini
    if (userState === 'gemini_chat') {
      try {
        await ctx.reply('💭 Думаю... ⏳');

        const response = await this.geminiService.analyzeText(text);

        await ctx.reply(`🤖 *Gemini:*\n\n${response}`, {
          parse_mode: 'Markdown',
          ...geminiKeyboard
        });

        // Сохраняем сообщение в БД
        await this.databaseService.saveMessage(ctx.from.id, text);

        this.logger.log(`Gemini chat response sent to user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error in Gemini chat: ${error.message}`);
        await ctx.reply('❌ Ошибка при обработке сообщения', geminiKeyboard);
      }
    } else {
      // Обычное сообщение вне режимов
      await ctx.reply(
        '👋 Используйте меню ниже для выбора функций!',
        mainKeyboard
      );
    }
  }

  // ============================================
  // 📊 ДИАГНОСТИЧЕСКИЕ КОМАНДЫ
  // ============================================

  @Command('ping')
  async onPing(@Ctx() ctx: Context) {
    const startTime = Date.now();
    await ctx.reply('🏓 Pong!');
    const latency = Date.now() - startTime;
    await ctx.reply(`⚡️ Задержка: ${latency}мс`);
  }

  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const statusText = 
      `📊 *Статус системы*\n\n` +
      `✅ Бот работает\n` +
      `⏱ Uptime: ${hours}ч ${minutes}м\n` +
      `🤖 Gemini AI: Активен\n` +
      `💾 База данных: Подключена`;

    await ctx.reply(statusText, {
      parse_mode: 'Markdown',
      ...mainKeyboard
    });
  }
}