/**
 * TypeScript типы для Broadcast System
 * 
 * Импортируй в своих файлах:
 * import { BroadcastOptions, BroadcastResult } from './broadcast.types';
 */

// ========================================
// Основные типы
// ========================================

/**
 * Опции для отправки рассылки
 */
export interface BroadcastOptions {
  /** Текст сообщения */
  message: string;
  
  /** Режим парсинга текста */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  
  /** Inline кнопки */
  buttons?: BroadcastButton[][];
  
  /** URL изображения */
  imageUrl?: string;
  
  /** URL видео */
  videoUrl?: string;
  
  /** Целевой сегмент пользователей */
  targetSegment?: BroadcastSegment;
  
  /** Время отправки (для отложенных рассылок) */
  scheduledFor?: Date;
}

/**
 * Результат выполнения рассылки
 */
export interface BroadcastResult {
  /** Общее количество пользователей */
  totalUsers: number;
  
  /** Успешно отправлено */
  successful: number;
  
  /** Ошибки отправки */
  failed: number;
  
  /** Заблокировали бота */
  blocked: number;
  
  /** Длительность в миллисекундах */
  duration: number;
  
  /** Список ошибок */
  errors: BroadcastError[];
}

/**
 * Ошибка при отправке конкретному пользователю
 */
export interface BroadcastError {
  /** ID пользователя */
  userId: number;
  
  /** Текст ошибки */
  error: string;
}

/**
 * Кнопка для сообщения
 */
export interface BroadcastButton {
  /** Текст на кнопке */
  text: string;
  
  /** URL для перехода (внешняя ссылка) */
  url?: string;
  
  /** Callback data (для обработки в боте) */
  callback_data?: string;
}

/**
 * Сегменты пользователей для таргетинга
 */
export type BroadcastSegment = 
  | 'all'        // Все пользователи
  | 'subscribed' // Только с активной подпиской
  | 'free'       // Без активной подписки
  | 'premium';   // Только premium подписчики

// ========================================
// Database типы
// ========================================

/**
 * Запись рассылки в базе данных
 */
export interface BroadcastRecord {
  /** UUID рассылки */
  id: string;
  
  /** Текст сообщения */
  message: string;
  
  /** Режим парсинга */
  parse_mode: string;
  
  /** URL изображения */
  image_url?: string;
  
  /** URL видео */
  video_url?: string;
  
  /** Целевой сегмент */
  target_segment: BroadcastSegment;
  
  /** Целевое количество пользователей */
  target_count: number;
  
  /** Успешно отправлено */
  successful_count: number;
  
  /** Ошибки */
  failed_count: number;
  
  /** Заблокировали */
  blocked_count: number;
  
  /** Длительность в мс */
  duration_ms: number;
  
  /** Статус рассылки */
  status: BroadcastStatus;
  
  /** Запланировано на */
  scheduled_for?: string;
  
  /** Дата создания */
  created_at: string;
  
  /** Дата завершения */
  completed_at?: string;
}

/**
 * Статусы рассылки
 */
export type BroadcastStatus = 
  | 'pending'     // Ожидает отправки
  | 'in_progress' // В процессе
  | 'completed'   // Завершена
  | 'failed';     // Провалена

/**
 * Лог отправки конкретному пользователю
 */
export interface BroadcastLog {
  /** UUID лога */
  id: string;
  
  /** UUID рассылки */
  broadcast_id: string;
  
  /** ID пользователя в системе */
  user_id: number;
  
  /** Telegram ID */
  telegram_id: number;
  
  /** Статус отправки */
  status: 'sent' | 'failed' | 'blocked';
  
  /** Сообщение об ошибке */
  error_message?: string;
  
  /** Дата отправки */
  sent_at: string;
}

// ========================================
// API Request/Response типы
// ========================================

/**
 * DTO для отправки рассылки через API
 */
export interface SendBroadcastDto {
  /** Токен администратора */
  adminToken: string;
  
  /** Текст сообщения */
  message: string;
  
  /** Режим парсинга */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  
  /** Кнопки */
  buttons?: BroadcastButton[][];
  
  /** URL изображения */
  imageUrl?: string;
  
  /** URL видео */
  videoUrl?: string;
  
  /** Сегмент */
  targetSegment?: BroadcastSegment;
  
  /** Запланировать на (ISO строка) */
  scheduledFor?: string;
}

/**
 * DTO для тестовой рассылки
 */
export interface TestBroadcastDto {
  /** Токен администратора */
  adminToken: string;
  
  /** Текст сообщения */
  message: string;
  
  /** Режим парсинга */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  
  /** Кнопки */
  buttons?: BroadcastButton[][];
  
  /** Telegram ID админов */
  adminIds: number[];
}

/**
 * API Response - успех
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * API Response - ошибка
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
}

/**
 * Response от /broadcast/history
 */
export interface BroadcastHistoryResponse extends ApiSuccessResponse {
  data: BroadcastRecord[];
}

/**
 * Response от /broadcast/stats/:id
 */
export interface BroadcastStatsResponse extends ApiSuccessResponse {
  data: BroadcastRecord;
}

// ========================================
// Конфигурация
// ========================================

/**
 * Конфигурация Broadcast сервиса
 */
export interface BroadcastConfig {
  /** Задержка между сообщениями (мс) */
  rateLimitDelay: number;
  
  /** Размер батча для обработки */
  batchSize: number;
  
  /** ID администраторов */
  adminIds: number[];
  
  /** Токен администратора */
  adminToken: string;
}

// ========================================
// Статистика
// ========================================

/**
 * Общая статистика broadcast системы
 */
export interface BroadcastSystemStats {
  /** Всего рассылок */
  totalBroadcasts: number;
  
  /** Всего отправлено сообщений */
  totalMessagesSent: number;
  
  /** Средний success rate (%) */
  avgSuccessRate: number;
  
  /** Всего заблокировавших бота */
  totalBlockedUsers: number;
  
  /** Последняя рассылка */
  lastBroadcast?: BroadcastRecord;
}

/**
 * Статистика по сегментам
 */
export interface SegmentStats {
  segment: BroadcastSegment;
  userCount: number;
  activeSubscriptions?: number;
}

// ========================================
// Webhook типы
// ========================================

/**
 * Тип для Telegram Update
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// ========================================
// Utility типы
// ========================================

/**
 * Partial тип для обновления рассылки
 */
export type UpdateBroadcastDto = Partial<Omit<BroadcastRecord, 'id' | 'created_at'>>;

/**
 * Query параметры для истории
 */
export interface BroadcastHistoryQuery {
  /** Лимит записей */
  limit?: number;
  
  /** Offset для пагинации */
  offset?: number;
  
  /** Фильтр по статусу */
  status?: BroadcastStatus;
  
  /** Фильтр по сегменту */
  segment?: BroadcastSegment;
  
  /** Сортировка */
  sortBy?: 'created_at' | 'completed_at' | 'successful_count';
  
  /** Направление сортировки */
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// Type Guards
// ========================================

/**
 * Проверка что объект является BroadcastResult
 */
export function isBroadcastResult(obj: any): obj is BroadcastResult {
  return (
    typeof obj === 'object' &&
    typeof obj.totalUsers === 'number' &&
    typeof obj.successful === 'number' &&
    typeof obj.failed === 'number' &&
    typeof obj.blocked === 'number' &&
    typeof obj.duration === 'number' &&
    Array.isArray(obj.errors)
  );
}

/**
 * Проверка что сегмент валидный
 */
export function isValidSegment(segment: string): segment is BroadcastSegment {
  return ['all', 'subscribed', 'free', 'premium'].includes(segment);
}

/**
 * Проверка что статус валидный
 */
export function isValidStatus(status: string): status is BroadcastStatus {
  return ['pending', 'in_progress', 'completed', 'failed'].includes(status);
}