import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { SubscriptionCommand } from './commands/subscription.command';
import { GeminiService } from '../ai/gemini.service';
import { ReplicateService } from '../replicate/replicate.service';
import { DatabaseService } from '../database/database.service';
import { ImageProcessingService } from '../image-processing/image-processing.service';
import { StorageService } from '../image-processing/storage.service';
import { 
  KEYBOARD_BUTTONS, 
  mainKeyboard, 
  geminiKeyboard, 
  videoKeyboard, 
  audioKeyboard,
  scanKeyboard, // НОВОЕ
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
    private readonly replicateService: ReplicateService,
    private readonly databaseService: DatabaseService,
    private readonly imageProcessingService: ImageProcessingService, // НОВОЕ
    private readonly storageService: StorageService, // НОВОЕ
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
        if (text === '/start') return await this.handleStart(ctx);
        if (text === '/help') return await this.handleHelp(ctx);
        if (text === '/subscription') return await this.handleSubscription(ctx);
        if (text === '/ping') return await this.handlePing(ctx);
        if (text === '/status') return await this.handleStatus(ctx);
        if (text.startsWith('/imagine')) return await this.handleImagine(ctx);

        // Кнопки главного меню
        if (text === KEYBOARD_BUTTONS.PROFILE) return await this.handleProfile(ctx);
        if (text === KEYBOARD_BUTTONS.GEMINI) return await this.handleGemini(ctx);
        if (text === KEYBOARD_BUTTONS.VIDEO_AI) return await this.handleVideoAI(ctx);
        if (text === KEYBOARD_BUTTONS.AUDIO_AI) return await this.handleAudioAI(ctx);
        if (text === KEYBOARD_BUTTONS.IMAGE_AI) return await this.handleImageAI(ctx);
        if (text === KEYBOARD_BUTTONS.SCAN) return await this.handleScan(ctx); // НОВОЕ
        if (text === KEYBOARD_BUTTONS.HELP) return await this.handleHelp(ctx);
        if (text === KEYBOARD_BUTTONS.MAIN_MENU) return await this.handleMainMenu(ctx);

        // Кнопки подменю Gemini
        if (text === KEYBOARD_BUTTONS.GEMINI_CHAT) return await this.handleGeminiChat(ctx);
        if (text === KEYBOARD_BUTTONS.GEMINI_ANALYZE_IMAGE) return await this.handleGeminiAnalyzeImage(ctx);
        if (text === KEYBOARD_BUTTONS.GEMINI_BACK) return await this.handleGeminiBack(ctx);

        // Кнопки подменю Видео
        if (text === KEYBOARD_BUTTONS.VIDEO_ANALYZE) return await this.handleVideoAnalyze(ctx);
        if (text === KEYBOARD_BUTTONS.VIDEO_GENERATE_FROM_TEXT) return await this.handleVideoGenerateFromText(ctx);
        if (text === KEYBOARD_BUTTONS.VIDEO_GENERATE_FROM_IMAGE) return await this.handleVideoGenerateFromImage(ctx);
        if (text === KEYBOARD_BUTTONS.VIDEO_BACK) return await this.handleVideoBack(ctx);

        // Кнопки подменю Аудио
        if (text === KEYBOARD_BUTTONS.AUDIO_TRANSCRIBE) return await this.handleAudioTranscribe(ctx);
        if (text === KEYBOARD_BUTTONS.AUDIO_ANALYZE) return await this.handleAudioAnalyze(ctx);
        if (text === KEYBOARD_BUTTONS.AUDIO_BACK) return await this.handleAudioBack(ctx);

        // НОВОЕ: Кнопки подменю Сканирования
        if (text === KEYBOARD_BUTTONS.SCAN_OCR) return await this.handleScanOCR(ctx);
        if (text === KEYBOARD_BUTTONS.SCAN_QR) return await this.handleScanQR(ctx);
        if (text === KEYBOARD_BUTTONS.SCAN_DOCUMENT) return await this.handleScanDocument(ctx);
        if (text === KEYBOARD_BUTTONS.SCAN_HISTORY) return await this.handleScanHistory(ctx);
        if (text === KEYBOARD_BUTTONS.SCAN_BACK) return await this.handleScanBack(ctx);

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
  // 📝 КОМАНДЫ (существующие методы остаются без изменений)
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
      `🎬 MiniMax Video AI: Активен\n` +
      `🔍 Image Processing: Активен\n` + // НОВОЕ
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

      // НОВОЕ: Получаем статистику сканирований
      const scanStats = await this.storageService.getUserScanStats(ctx.from.id);

      const lastSeen = new Date(user.last_seen).toLocaleString('ru-RU');
      
      const profileText = 
        `👤 *Ваш профиль*\n\n` +
        `🆔 Telegram ID: \`${user.telegram_id}\`\n` +
        `👤 Имя: ${user.first_name}\n` +
        `📝 Username: @${user.username || 'не указан'}\n` +
        `📅 Последняя активность: ${lastSeen.replace(/[.,:]/g, '\\$&')}\n\n` +
        `📊 *Статистика сканирований:*\n` +
        `📄 OCR: ${scanStats.ocr}\n` +
        `📱 QR/Штрихкод: ${scanStats.qr + scanStats.barcode}\n` +
        `📐 Документы: ${scanStats.document}\n` +
        `🔍 Анализы: ${scanStats.analysis}\n` +
        `📈 Всего: ${scanStats.total}`;

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
      `✨ Видео из текста - создание видео по описанию\n` +
      `🎬 Видео из изображения - анимация картинки`;

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

  // ============================================
  // 🔍 СКАНИРОВАНИЕ - НОВОЕ
  // ============================================

  private async handleScan(ctx: Context) {
    const text = 
      `🔍 *Сканирование и обработка изображений*\n\n` +
      `Выберите действие:\n\n` +
      `📄 *OCR (Текст)* - распознавание текста с фото\n` +
      `📱 *QR/Штрихкод* - сканирование QR кодов и штрихкодов\n` +
      `📐 *Документ* - улучшение и обработка документов\n` +
      `📜 *История* - просмотр истории сканирований`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...scanKeyboard
    });
  }

  private async handleScanOCR(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'scan_ocr');
    
    await ctx.reply(
      '📄 *Режим OCR (распознавание текста)*\n\n' +
      '📸 Отправьте фото документа, чека, визитки или любого текста\n\n' +
      '💡 Поддерживаются языки:\n' +
      '• Английский\n' +
      '• Русский\n' +
      '• И многие другие\n\n' +
      '⚡️ Совет: для лучшего результата делайте четкие фото при хорошем освещении\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...scanKeyboard
      }
    );
  }

  private async handleScanQR(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'scan_qr');
    
    await ctx.reply(
      '📱 *Режим сканирования QR/Штрихкодов*\n\n' +
      '📸 Отправьте фото с QR кодом или штрихкодом\n\n' +
      '✅ Поддерживаются:\n' +
      '• QR коды\n' +
      '• EAN-13\n' +
      '• UPC-A\n' +
      '• Code 128\n' +
      '• И другие форматы\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...scanKeyboard
      }
    );
  }

  private async handleScanDocument(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'scan_document');
    
    await ctx.reply(
      '📐 *Режим обработки документов*\n\n' +
      '📸 Отправьте фото документа для улучшения качества\n\n' +
      '🎯 Функции:\n' +
      '• Автокадрирование\n' +
      '• Выравнивание перспективы\n' +
      '• Повышение контраста\n' +
      '• Улучшение читаемости текста\n\n' +
      'Для выхода нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...scanKeyboard
      }
    );
  }

  private async handleScanHistory(ctx: Context) {
    if (!ctx.from) return;

    try {
      await ctx.reply('📜 Загружаю историю сканирований... ⏳');

      const history = await this.storageService.getUserScanHistory(ctx.from.id, 10);

      if (history.length === 0) {
        await ctx.reply(
          '📜 История сканирований пуста\n\n' +
          'Выполните первое сканирование!',
          scanKeyboard
        );
        return;
      }

      let historyText = '📜 *История сканирований* (последние 10):\n\n';

      for (let i = 0; i < history.length; i++) {
        const scan = history[i];
        const date = new Date(scan.created_at!).toLocaleString('ru-RU');
        const typeEmoji = this.getScanTypeEmoji(scan.scan_type);
        
        historyText += `${i + 1}. ${typeEmoji} *${this.getScanTypeName(scan.scan_type)}*\n`;
        historyText += `   📅 ${date}\n`;
        
        if (scan.scan_type === 'ocr' && scan.result_data?.text) {
          const preview = scan.result_data.text.substring(0, 50);
          historyText += `   📝 ${preview}${scan.result_data.text.length > 50 ? '...' : ''}\n`;
        } else if (scan.scan_type === 'qr' && scan.result_data?.data) {
          historyText += `   🔗 ${scan.result_data.data}\n`;
        }
        
        historyText += '\n';
      }

      await ctx.reply(historyText, {
        parse_mode: 'Markdown',
        ...scanKeyboard
      });

    } catch (error) {
      this.logger.error(`Error fetching scan history: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке истории', scanKeyboard);
    }
  }

  private async handleScanBack(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.delete(ctx.from.id);
    
    await ctx.reply('⬅️ Возврат в главное меню', mainKeyboard);
  }

  private getScanTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      ocr: '📄',
      qr: '📱',
      barcode: '📊',
      document: '📐',
      analysis: '🔍',
    };
    return emojis[type] || '📋';
  }

  private getScanTypeName(type: string): string {
    const names: Record<string, string> = {
      ocr: 'OCR (Текст)',
      qr: 'QR код',
      barcode: 'Штрихкод',
      document: 'Документ',
      analysis: 'Анализ',
    };
    return names[type] || type;
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
  // 🤖 GEMINI ПОДМЕНЮ (без изменений)
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
  // 🎥 ВИДЕО ПОДМЕНЮ (существующие методы остаются)
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

  private async handleVideoGenerateFromText(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'video_generate_text');
    this.videoGenerationStates.set(ctx.from.id, { state: 'waiting_for_text_prompt' });
    
    await ctx.reply(
      '✨ *Генерация видео из текста*\n\n' +
      '📝 Опишите, какое видео вы хотите создать:\n\n' +
      '💡 *Примеры:*\n' +
      '• "A fluffy orange cat dancing in a colorful room"\n' +
      '• "A peaceful garden with cherry blossoms swaying"\n' +
      '• "A majestic eagle soaring through mountain clouds"\n' +
      '• "Cyberpunk city street at night with neon lights"\n\n' +
      '⚡️ Чем детальнее описание, тем лучше результат!\n\n' +
      'Для отмены нажмите "⬅️ Назад"',
      { 
        parse_mode: 'Markdown',
        ...videoKeyboard
      }
    );
  }

  private async handleVideoGenerateFromImage(ctx: Context) {
    if (!ctx.from) return;
    
    this.userStates.set(ctx.from.id, 'video_generate_image');
    this.videoGenerationStates.set(ctx.from.id, { state: 'waiting_for_image' });
    
    await ctx.reply(
      '🎬 *Генерация видео из изображения*\n\n' +
      '📸 Отправьте изображение, которое хотите анимировать\n\n' +
      '💡 Затем опишите, как его анимировать!\n\n' +
      '✨ *Примеры описаний:*\n' +
      '• "The subject slowly turns and smiles"\n' +
      '• "Camera slowly zooms in with dramatic effect"\n' +
      '• "Add gentle wind and moving clouds"\n' +
      '• "Make the scene come alive with subtle movements"\n\n' +
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
  // 🎙 АУДИО ПОДМЕНЮ (без изменений)
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
    const videoGenState = this.videoGenerationStates.get(ctx.from.id);

    // 🔍 НОВОЕ: Обработка сканирования
    if (userState === 'scan_ocr') {
      await this.processScanOCR(ctx);
      return;
    }

    if (userState === 'scan_qr') {
      await this.processScanQR(ctx);
      return;
    }

    if (userState === 'scan_document') {
      await this.processScanDocument(ctx);
      return;
    }

    // 🎬 Генерация видео из изображения
    if (userState === 'video_generate_image' && videoGenState?.state === 'waiting_for_image') {
      try {
        await ctx.reply('📸 Получил изображение! Загружаю... ⏳');

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);

        this.videoGenerationStates.set(ctx.from.id, {
          state: 'waiting_for_image_prompt',
          videoUrl: fileLink.href,
          fileId: photo.file_id,
        });

        await ctx.reply(
          '✅ Изображение получено!\n\n' +
          '📝 Теперь опишите, как его анимировать:\n\n' +
          '💡 *Примеры:*\n' +
          '• "The subject slowly turns and smiles"\n' +
          '• "Camera slowly zooms in"\n' +
          '• "Add gentle wind blowing through hair"\n' +
          '• "Make it come alive with subtle movements"\n\n' +
          '⚡️ Чем детальнее, тем лучше!',
          { 
            parse_mode: 'Markdown',
            ...videoKeyboard
          }
        );

        this.logger.log(`Image received for video generation from user ${ctx.from.id}`);
      } catch (error) {
        this.logger.error(`Error receiving image: ${error.message}`);
        await ctx.reply('❌ Ошибка при получении изображения', videoKeyboard);
      }
    }
    // Анализ изображения (существующая функциональность)
    else if (userState === 'gemini_analyze_image') {
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
        'Для работы с изображениями перейдите в соответствующий раздел меню',
        mainKeyboard
      );
    }
  }

  // ============================================
  // 🔍 НОВЫЕ МЕТОДЫ ОБРАБОТКИ СКАНИРОВАНИЯ
  // ============================================

  private async processScanOCR(ctx: Context) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

    try {
      await ctx.reply('📄 Распознаю текст... ⏳');

      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);

      // Выполняем OCR
      const ocrResult = await this.imageProcessingService.extractTextFromImage(fileLink.href);

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        await ctx.reply(
          '❌ Текст не найден на изображении\n\n' +
          '💡 Попробуйте:\n' +
          '• Сделать более четкое фото\n' +
          '• Улучшить освещение\n' +
          '• Убедиться, что текст читаемый',
          scanKeyboard
        );
        return;
      }

      // Сохраняем результат в БД
      await this.storageService.saveScanRecord({
        user_id: ctx.from.id,
        scan_type: 'ocr',
        original_image_url: fileLink.href,
        result_data: {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          blocks_count: ocrResult.blocks?.length || 0,
        },
      });

      // Формируем ответ
      const responseText = 
        `✅ *Текст распознан!*\n\n` +
        `📝 Результат:\n` +
        `\`\`\`\n${ocrResult.text.substring(0, 3000)}\n\`\`\`\n\n` +
        `📊 Уверенность: ${ocrResult.confidence ? Math.round(ocrResult.confidence) + '%' : 'N/A'}\n` +
        `📄 Блоков текста: ${ocrResult.blocks?.length || 0}`;

      await ctx.reply(responseText, {
        parse_mode: 'Markdown',
        ...scanKeyboard
      });

      this.logger.log(`OCR completed for user ${ctx.from.id}`);
    } catch (error) {
      this.logger.error(`Error in OCR processing: ${error.message}`);
      await ctx.reply('❌ Ошибка при распознавании текста', scanKeyboard);
    }
  }

  private async processScanQR(ctx: Context) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

    try {
      await ctx.reply('📱 Сканирую QR/штрихкод... ⏳');

      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);

      // Выполняем сканирование
      const qrResults = await this.imageProcessingService.scanQRCode(fileLink.href);

      if (qrResults.length === 0) {
        await ctx.reply(
          '❌ QR код или штрихкод не найден\n\n' +
          '💡 Попробуйте:\n' +
          '• Сделать более четкое фото\n' +
          '• Убедиться, что код полностью в кадре\n' +
          '• Улучшить освещение',
          scanKeyboard
        );
        return;
      }

      // Сохраняем результаты
      for (const result of qrResults) {
        await this.storageService.saveScanRecord({
          user_id: ctx.from.id,
          scan_type: result.type === 'qr' ? 'qr' : 'barcode',
          original_image_url: fileLink.href,
          result_data: {
            data: result.data,
            format: result.format,
          },
        });
      }

      // Формируем ответ
      let responseText = `✅ *Найдено кодов: ${qrResults.length}*\n\n`;
      
      qrResults.forEach((result, index) => {
        responseText += `${index + 1}. ${result.type === 'qr' ? '📱 QR код' : '📊 Штрихкод'}\n`;
        responseText += `   🔗 Данные: \`${result.data}\`\n`;
        if (result.format) {
          responseText += `   📋 Формат: ${result.format}\n`;
        }
        responseText += '\n';
      });

      await ctx.reply(responseText, {
        parse_mode: 'Markdown',
        ...scanKeyboard
      });

      this.logger.log(`QR scan completed for user ${ctx.from.id}, found ${qrResults.length} codes`);
    } catch (error) {
      this.logger.error(`Error in QR scanning: ${error.message}`);
      await ctx.reply('❌ Ошибка при сканировании кода', scanKeyboard);
    }
  }

  private async processScanDocument(ctx: Context) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

    try {
      await ctx.reply('📐 Обрабатываю документ... ⏳');

      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);

      // Обрабатываем документ
      const processedBuffer = await this.imageProcessingService.processDocument(fileLink.href);

      // Сохраняем обработанное изображение
      const processedUrl = await this.storageService.uploadImage(
        ctx.from.id,
        processedBuffer,
        'processed_document.jpg'
      );

      // Сохраняем запись
      await this.storageService.saveScanRecord({
        user_id: ctx.from.id,
        scan_type: 'document',
        original_image_url: fileLink.href,
        processed_image_url: processedUrl,
        result_data: {
          processed: true,
        },
      });

      // Отправляем обработанный документ
      await ctx.replyWithPhoto(
        { source: processedBuffer },
        {
          caption: 
            '✅ *Документ обработан!*\n\n' +
            '🎯 Применены:\n' +
            '• Автокадрирование\n' +
            '• Коррекция перспективы\n' +
            '• Повышение контраста',
          parse_mode: 'Markdown',
          ...scanKeyboard
        }
      );

      this.logger.log(`Document processed for user ${ctx.from.id}`);
    } catch (error) {
      this.logger.error(`Error in document processing: ${error.message}`);
      await ctx.reply('❌ Ошибка при обработке документа', scanKeyboard);
    }
  }

  // Остальные методы (handleVoice, handleVideo, handleText) остаются без изменений
  // но для краткости кода я их пропущу здесь

  private async handleVoice(ctx: Context) {
    // ... существующий код ...
  }

  private async handleVideo(ctx: Context) {
    // ... существующий код ...
  }

  private async handleText(ctx: Context) {
    // ... существующий код ...
  }

  private async generateTextToVideo(ctx: Context, prompt: string) {
    // ... существующий код ...
  }

  private async generateImageToVideo(ctx: Context, prompt: string, imageUrl: string) {
    // ... существующий код ...
  }
}