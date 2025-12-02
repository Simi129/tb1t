import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { SubscriptionCommand } from './commands/subscription.command';
import { GeminiService } from '../ai/gemini.service';
import { RunwayService } from '../runway/runway.service';
import { DatabaseService } from '../database/database.service';
import { 
  KEYBOARD_BUTTONS, 
  mainKeyboard, 
  geminiKeyboard, 
  videoKeyboard, 
  audioKeyboard 
} from './keyboard.config';

/**
 * Интерфейс для отслеживания состояния генерации видео
 */
interface UserVideoState {
  state: string;
  videoUrl?: string;
  fileId?: string;
}

@Injectable()
export class TelegramHandlers {
  private readonly logger = new Logger(TelegramHandlers.name);
  
  // Для отслеживания состояния пользователей
  private userStates = new Map<number, string>();
  
  // Для отслеживания состояния генерации видео
  private videoGenerationStates = new Map<number, UserVideoState>();

  constructor(
    private readonly startCommand: StartCommand,
    private readonly helpCommand: HelpCommand,
    private readonly subscriptionCommand: SubscriptionCommand,
    private readonly geminiService: GeminiService,
    private readonly runwayService: RunwayService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Главный обработчик всех обновлений
   */
  async handleUpdate(ctx: Context) {
    try {
      // Обработка команд
      if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;

        // Команды
        if (text === '/start') {
          return await this.handleStart(ctx);
        }
        if (text === '/help') {
          return await this.handleHelp(ctx);
        }
        if (text === '/subscription') {
          return await this.handleSubscription(ctx);
        }
        if (text === '/ping') {
          return await this.handlePing(ctx);
        }
        if (text === '/status') {
          return await this.handleStatus(ctx);
        }
        if (text.startsWith('/imagine')) {
          return await this.handleImagine(ctx);
        }

        // Кнопки главного меню
        if (text === KEYBOARD_BUTTONS.PROFILE) {
          return await this.handleProfile(ctx);
        }
        if (text === KEYBOARD_BUTTONS.GEMINI) {
          return await this.handleGemini(ctx);
        }
        if (text === KEYBOARD_BUTTONS.VIDEO_AI) {
          return await this.handleVideoAI(ctx);
        }
        if (text === KEYBOARD_BUTTONS.AUDIO_AI) {
          return await this.handleAudioAI(ctx);
        }
        if (text === KEYBOARD_BUTTONS.IMAGE_AI) {
          return await this.handleImageAI(ctx);
        }
        if (text === KEYBOARD_BUTTONS.HELP) {
          return await this.handleHelp(ctx);
        }
        if (text === KEYBOARD_BUTTONS.MAIN_MENU) {
          return await this.handleMainMenu(ctx);
        }

        // Кнопки подменю Gemini
        if (text === KEYBOARD_BUTTONS.GEMINI_CHAT) {
          return await this.handleGeminiChat(ctx);
        }
        if (text === KEYBOARD_BUTTONS.GEMINI_ANALYZE_IMAGE) {
          return await this.handleGeminiAnalyzeImage(ctx);
        }
        if (text === KEYBOARD_BUTTONS.GEMINI_BACK) {
          return await this.handleGeminiBack(ctx);
        }

        // Кнопки подменю Видео
        if (text === KEYBOARD_BUTTONS.VIDEO_ANALYZE) {
          return await this.handleVideoAnalyze(ctx);
        }
        if (text === KEYBOARD_BUTTONS.VIDEO_GENERATE) {
          return await this.handleVideoGenerate(ctx);
        }
        if (text === KEYBOARD_BUTTONS.VIDEO_BACK) {
          return await this.handleVideoBack(ctx);
        }

        // Кнопки подменю Аудио
        if (text === KEYBOARD_BUTTONS.AUDIO_TRANSCRIBE) {
          return await this.handleAudioTranscribe(ctx);
        }
        if (text === KEYBOARD_BUTTONS.AUDIO_ANALYZE) {
          return await this.handleAudioAnalyze(ctx);
        }
        if (text === KEYBOARD_BUTTONS.AUDIO_BACK) {
          return await this.handleAudioBack(ctx);
        }

        // Обычный текст (возможно чат с Gemini)
        return await this.handleText(ctx);
      }

      // Обработка фото
      if (ctx.message && 'photo' in ctx.message) {
        return await this.handlePhoto(ctx);
      }

      // Обработка голосовых сообщений
      if (ctx.message && 'voice' in ctx.message) {
        return await this.handleVoice(ctx);
      }

      // Обработка видео
      if (ctx.message && 'video' in ctx.message) {
        return await this.handleVideo(ctx);
      }

    } catch (error) {
      this.logger.error(`Error handling update: ${error.message}`, error.stack);
      if (ctx.reply) {
        await ctx.reply('❌ Произошла ошибка при обработке запроса');
      }
    }
  }

  // ============================================
  // 📝 КОМАНДЫ
  // ============================================

  private async handleStart(ctx: Context) {
    await this.startCommand.execute(ctx);
  }

  private async handleHelp(ctx: Context) {
    await this.helpCommand.execute(ctx);
  }

  private async handleSubscription(ctx: Context) {
    await this.subscriptionCommand.execute(ctx);
  }

  private async handlePing(ctx: Context) {
    const startTime = Date.now();
    await ctx.reply('🏓 Pong!');
    const latency = Date.now() - startTime;
    await ctx.reply(`⚡️ Задержка: ${latency}мс`);
  }

  private async handleStatus(ctx: Context) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const statusText = 
      `📊 *Статус системы*\n\n` +
      `✅ Бот работает\n` +
      `⏱ Uptime: ${hours}ч ${minutes}м\n` +
      `🤖 Gemini AI: Активен\n` +
      `🎬 Runway AI: Активен\n` +
      `💾 База данных: Подключена`;

    await ctx.reply(statusText, {
      parse_mode: 'Markdown',
      ...mainKeyboard
    });
  }

  private async handleImagine(ctx: Context) {
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
  // 🎹 ГЛАВНОЕ МЕНЮ
  // ============================================

  private async handleProfile(ctx: Context) {
    if (!ctx.from) return;

    try {
      const user = await this.databaseService.getUser(ctx.from.id);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден', mainKeyboard);
        return;
      }

      const lastSeen = new Date(user.last_seen).toLocaleString('ru-RU');
      
      const profileText = 
        `👤 *Ваш профиль*\n\n` +
        `🆔 Telegram ID: \`${user.telegram_id}\`\n` +
        `👤 Имя: ${user.first_name}\n` +
        `📝 Username: @${user.username || 'не указан'}\n` +
        `📅 Последняя активность: ${lastSeen.replace(/[.,:]/g, '\\$&')}`;

      await ctx.reply(profileText, { 
        parse_mode: 'MarkdownV2',
        ...mainKeyboard
      });
    } catch (error) {
      this.logger.error(`Error in profile: ${error.message}`);
      await ctx.reply('❌ Ошибка при получении профиля', mainKeyboard);
    }
  }

  private async handleGemini(ctx: Context) {
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

  private async handleVideoAI(ctx: Context) {
    const text = 
      `🎬 *Видео с ИИ*\n\n` +
      `Выберите действие:\n` +
      `🎥 Анализ видео - описание содержимого\n` +
      `🎬 Создать видео с AI - трансформация видео с помощью Runway`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...videoKeyboard
    });
  }

  private async handleAudioAI(ctx: Context) {
    const text = 
      `🎙 *Аудио с ИИ*\n\n` +
      `Выберите действие:\n` +
      `📝 Транскрибация - перевод в текст\n` +
      `🎧 Анализ аудио - детальный разбор`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...audioKeyboard
    });
  }

  private async handleImageAI(ctx: Context) {
    const text = 
      `🖼 *Генерация изображений*\n\n` +
      `Используйте команду:\n` +
      `/imagine [описание]\n\n` +
      `Пример:\n` +
      `/imagine красивый закат над океаном`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...mainKeyboard
    });
  }

  private async handleMainMenu(ctx: Context) {
    if (!ctx.from) return;
    
    // Очистка всех состояний
    this.userStates.delete(ctx.from.id);
    this.videoGenerationStates.delete(ctx.from.id);
    
    await ctx.reply(
      '🏠 Главное меню',
      mainKeyboard
    );
  }

  // ============================================
  // 🤖 GEMINI ПОДМЕНЮ
  // ============================================

  private async handleGeminiChat(ctx: Context) {
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

  private async handleGeminiAnalyzeImage(ctx: Context) {
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

  private async handleGeminiBack(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 🎥 ВИДЕО ПОДМЕНЮ
  // ============================================

  private async handleVideoAnalyze(ctx: Context) {
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

  /**
   * 🎬 НОВОЕ: Обработчик генерации видео с Runway AI
   */
  private async handleVideoGenerate(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'video_generate');
    this.videoGenerationStates.set(ctx.from.id, { state: 'waiting_for_video' });
    
    await ctx.reply(
      '🎬 *Генерация видео с Runway AI*\n\n' +
      '📹 Отправьте исходное видео (макс. 5 секунд будет обработано)\n\n' +
      '💡 Затем опишите, как его трансформировать!\n\n' +
      '✨ *Примеры трансформаций:*\n' +
      '• "Transform into a dreamy watercolor painting"\n' +
      '• "Add snow falling gently"\n' +
      '• "Make it look like an old VHS tape"\n' +
      '• "Turn into cyberpunk neon style"\n\n' +
      'Для отмены нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...videoKeyboard
      }
    );
  }

  private async handleVideoBack(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    this.videoGenerationStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 🎙 АУДИО ПОДМЕНЮ
  // ============================================

  private async handleAudioTranscribe(ctx: Context) {
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

  private async handleAudioAnalyze(ctx: Context) {
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

  private async handleAudioBack(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  // ============================================
  // 📥 МЕДИА ОБРАБОТЧИКИ
  // ============================================

  private async handlePhoto(ctx: Context) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);

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

  private async handleVoice(ctx: Context) {
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

  /**
   * 🎬 ОБНОВЛЕНО: Обработчик видео с поддержкой генерации через Runway
   */
  private async handleVideo(ctx: Context) {
    if (!ctx.from || !ctx.message || !('video' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);
    const videoGenState = this.videoGenerationStates.get(ctx.from.id);

    // 🎬 НОВОЕ: Генерация видео с Runway
    if (userState === 'video_generate' && videoGenState?.state === 'waiting_for_video') {
      try {
        await ctx.reply('📹 Получил видео! Загружаю... ⏳');

        const video = ctx.message.video;
        const fileLink = await ctx.telegram.getFileLink(video.file_id);

        // Сохраняем URL и file_id видео
        this.videoGenerationStates.set(ctx.from.id, {
          state: 'waiting_for_prompt',
          videoUrl: fileLink.href,
          fileId: video.file_id,
        });

        await ctx.reply(
          '✅ Видео получено!\n\n' +
          '📝 Теперь опишите, как его трансформировать:\n\n' +
          '💡 *Примеры:*\n' +
          '• Transform into a dreamy watercolor painting style\n' +
          '• Add dramatic cyberpunk neon lighting\n' +
          '• Make it look like vintage 1980s VHS footage\n' +
          '• Turn into anime style with smooth movements\n\n' +
          '⚡️ Чем детальнее описание, тем лучше результат!',
          { 
            parse_mode: 'Markdown',
            ...videoKeyboard
          }
        );

        this.logger.log(`Video received for generation from user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error receiving video: ${error.message}`);
        await ctx.reply('❌ Ошибка при получении видео', videoKeyboard);
      }
    }
    // Анализ видео (существующая функциональность)
    else if (userState === 'video_analyze') {
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
        'Для работы с видео перейдите в:\n🎬 Видео с ИИ',
        mainKeyboard
      );
    }
  }

  /**
   * 🎬 ОБНОВЛЕНО: Обработчик текста с поддержкой промптов для генерации видео
   */
  private async handleText(ctx: Context) {
    if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;

    const userState = this.userStates.get(ctx.from.id);
    const videoGenState = this.videoGenerationStates.get(ctx.from.id);
    const text = ctx.message.text;

    // 🎬 НОВОЕ: Обработка промпта для генерации видео
    if (userState === 'video_generate' && videoGenState?.state === 'waiting_for_prompt') {
      try {
        if (!videoGenState.videoUrl) {
          await ctx.reply('❌ Ошибка: видео не найдено. Попробуйте еще раз.', videoKeyboard);
          this.videoGenerationStates.set(ctx.from.id, { state: 'waiting_for_video' });
          return;
        }

        await ctx.reply(
          '🎬 Начинаю генерацию видео...\n\n' +
          '⏳ Это может занять 2-5 минут\n' +
          '☕️ Пожалуйста, подождите...',
          { parse_mode: 'Markdown' }
        );

        this.logger.log(`Starting video generation for user ${ctx.from.id} with prompt: "${text}"`);

        // Запускаем генерацию
        const videoUrl = await this.runwayService.generateAndWaitForVideo({
          prompt: text,
          videoUrl: videoGenState.videoUrl,
          aspectRatio: '16:9',
        });

        this.logger.log(`Video generated successfully for user ${ctx.from.id}: ${videoUrl}`);

        // Скачиваем видео
        await ctx.reply('📥 Скачиваю готовое видео... ⏳');
        const videoBuffer = await this.runwayService.downloadVideo(videoUrl);

        // Отправляем пользователю
        await ctx.replyWithVideo(
          { source: videoBuffer },
          {
            caption: 
              `✨ *Видео готово!*\n\n` +
              `📝 Промпт: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n` +
              `🎬 Сгенерировано с помощью Runway AI`,
            parse_mode: 'Markdown',
            ...videoKeyboard
          }
        );

        // Очищаем состояние
        this.videoGenerationStates.delete(ctx.from.id);

        this.logger.log(`Video sent successfully to user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error generating video: ${error.message}`, error.stack);
        await ctx.reply(
          '❌ *Ошибка при генерации видео*\n\n' +
          `Причина: ${error.message}\n\n` +
          'Попробуйте еще раз или выберите другое видео.',
          { 
            parse_mode: 'Markdown',
            ...videoKeyboard
          }
        );
        
        // Сброс состояния при ошибке - даем возможность попробовать снова
        this.videoGenerationStates.set(ctx.from.id, { state: 'waiting_for_video' });
      }
    }
    // Чат с Gemini (существующая функциональность)
    else if (userState === 'gemini_chat') {
      try {
        await ctx.reply('💭 Думаю... ⏳');

        const response = await this.geminiService.analyzeText(text);

        await ctx.reply(`🤖 *Gemini:*\n\n${response}`, {
          parse_mode: 'Markdown',
          ...geminiKeyboard
        });

        await this.databaseService.saveMessage(ctx.from.id, text);

        this.logger.log(`Gemini chat response sent to user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error in Gemini chat: ${error.message}`);
        await ctx.reply('❌ Ошибка при обработке сообщения', geminiKeyboard);
      }
    } else {
      await ctx.reply(
        '👋 Используйте меню ниже для выбора функций!',
        mainKeyboard
      );
    }
  }
}