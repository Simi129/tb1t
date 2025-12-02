import { Markup } from 'telegraf';

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
  VIDEO_GENERATE_FROM_IMAGE: '🎬 Видео из изображения',
  VIDEO_GENERATE_FROM_TEXT: '✨ Видео из текста',
  VIDEO_BACK: '⬅️ Назад',
  
  // Подменю Аудио
  AUDIO_TRANSCRIBE: '📝 Транскрибация',
  AUDIO_ANALYZE: '🎧 Анализ аудио',
  AUDIO_BACK: '⬅️ Назад',
} as const;

export const mainKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.PROFILE],
  [KEYBOARD_BUTTONS.GEMINI, KEYBOARD_BUTTONS.IMAGE_AI],
  [KEYBOARD_BUTTONS.VIDEO_AI, KEYBOARD_BUTTONS.AUDIO_AI],
  [KEYBOARD_BUTTONS.HELP],
])
  .resize()
  .persistent();

export const geminiKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.GEMINI_CHAT],
  [KEYBOARD_BUTTONS.GEMINI_ANALYZE_IMAGE],
  [KEYBOARD_BUTTONS.GEMINI_BACK],
])
  .resize()
  .persistent();

export const videoKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.VIDEO_ANALYZE],
  [KEYBOARD_BUTTONS.VIDEO_GENERATE_FROM_TEXT],
  [KEYBOARD_BUTTONS.VIDEO_GENERATE_FROM_IMAGE],
  [KEYBOARD_BUTTONS.VIDEO_BACK],
])
  .resize()
  .persistent();

export const audioKeyboard = Markup.keyboard([
  [KEYBOARD_BUTTONS.AUDIO_TRANSCRIBE],
  [KEYBOARD_BUTTONS.AUDIO_ANALYZE],
  [KEYBOARD_BUTTONS.AUDIO_BACK],
])
  .resize()
  .persistent();

export const removeKeyboard = Markup.removeKeyboard();