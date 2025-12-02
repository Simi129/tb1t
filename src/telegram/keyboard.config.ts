import { Markup } from 'telegraf';

/**
 * 🎹 Конфигурация клавиатуры бота
 */

export const KEYBOARD_BUTTONS = {
  // Главное меню
  PROFILE: '👤 Профиль',
  GEMINI: '🤖 Gemini AI',
  VIDEO_AI: '🎬 Видео с ИИ',
  AUDIO_AI: '🎙 Аудио с ИИ',
  IMAGE_AI: '🖼 Генерация изображений',
  HELP: '❓ Помощь',
  MAIN_MENU: '🏠 Главное меню',
  
  // Подменю Gemini
  GEMINI_CHAT: '💬 Чат с Gemini',
  GEMINI_ANALYZE_IMAGE: '🔍 Анализ изображения',
  GEMINI_BACK: '⬅️ Назад',
  
  // Подменю Видео
  VIDEO_ANALYZE: '🎥 Анализ видео',
  VIDEO_GENERATE: '🎬 Создать видео с AI',
  VIDEO_BACK: '⬅️ Назад',
  
  // Подменю Аудио
  AUDIO_TRANSCRIBE: '📝 Транскрибация',
  AUDIO_ANALYZE: '🎧 Анализ аудио',
  AUDIO_BACK: '⬅️ Назад',
} as const;

/**
 * Главное меню
 */
export const mainKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.PROFILE],
  [KEYBOARD_BUTTONS.GEMINI, KEYBOARD_BUTTONS.IMAGE_AI],
  [KEYBOARD_BUTTONS.VIDEO_AI, KEYBOARD_BUTTONS.AUDIO_AI],
  [KEYBOARD_BUTTONS.HELP],
])
  .resize()
  .persistent();

/**
 * Меню Gemini AI
 */
export const geminiKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.GEMINI_CHAT],
  [KEYBOARD_BUTTONS.GEMINI_ANALYZE_IMAGE],
  [KEYBOARD_BUTTONS.GEMINI_BACK],
])
  .resize()
  .persistent();

/**
 * Меню Видео с ИИ
 */
export const videoKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.VIDEO_ANALYZE],
  [KEYBOARD_BUTTONS.VIDEO_GENERATE],
  [KEYBOARD_BUTTONS.VIDEO_BACK],
])
  .resize()
  .persistent();

/**
 * Меню Аудио с ИИ
 */
export const audioKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.AUDIO_TRANSCRIBE],
  [KEYBOARD_BUTTONS.AUDIO_ANALYZE],
  [KEYBOARD_BUTTONS.AUDIO_BACK],
])
  .resize()
  .persistent();

/**
 * Вспомогательная функция для удаления клавиатуры
 */
export const removeKeyboard = Markup.removeKeyboard();