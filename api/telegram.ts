import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as geoip from 'geoip-lite';
import { Pool } from 'pg';

// Кэшируем инстансы для переиспользования
let bot: Telegraf | null = null;
let supabase: any = null;
let pgPool: Pool | null = null;

// Определение страны по IP
function isRussianIP(req: VercelRequest): boolean {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];
  
  let ip: string | null = null;
  
  if (xRealIp && typeof xRealIp === 'string') {
    ip = xRealIp;
  } else if (xForwardedFor) {
    const ips = typeof xForwardedFor === 'string' 
      ? xForwardedFor.split(',') 
      : xForwardedFor;
    ip = ips[0].trim();
  }
  
  console.log('📍 Client IP:', ip);
  
  if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
    console.log('⚠️ Local IP detected, using Supabase');
    return false;
  }
  
  const geo = geoip.lookup(ip);
  
  if (!geo) {
    console.log('⚠️ Could not determine location, using Supabase');
    return false;
  }
  
  const isRussian = geo.country === 'RU';
  console.log(`🌍 Country: ${geo.country}, Using: ${isRussian ? 'Own Server' : 'Supabase'}`);
  
  return isRussian;
}

// Инициализация PostgreSQL Pool (для твоего сервера)
function initPostgresPool() {
  if (!pgPool) {
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    console.log('✅ PostgreSQL Pool initialized');
  }
  return pgPool;
}

// Сохранение пользователя
async function saveUser(
  telegramId: number, 
  username: string, 
  firstName: string, 
  useOwnServer: boolean
) {
  if (useOwnServer) {
    console.log('💾 Saving user to OWN SERVER');
    const pool = initPostgresPool();
    
    const query = `
      INSERT INTO users (telegram_id, username, first_name, last_seen, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW(), NOW())
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_seen = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    
    const result = await pool.query(query, [telegramId, username, firstName]);
    console.log('✅ User saved to own server:', result.rows[0]);
    return result.rows[0];
  } else {
    console.log('💾 Saving user to SUPABASE');
    const { data, error } = await supabase
      .from('users')
      .upsert({
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'telegram_id'
      })
      .select();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('✅ User saved to Supabase:', data);
    return data;
  }
}

// Получение пользователя
async function getUser(telegramId: number, useOwnServer: boolean) {
  if (useOwnServer) {
    console.log('🔍 Getting user from OWN SERVER');
    const pool = initPostgresPool();
    
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await pool.query(query, [telegramId]);
    
    return result.rows[0] || null;
  } else {
    console.log('🔍 Getting user from SUPABASE');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    return data;
  }
}

// Сохранение сообщения
async function saveMessage(
  telegramId: number, 
  message: string, 
  useOwnServer: boolean
) {
  if (useOwnServer) {
    console.log('💾 Saving message to OWN SERVER');
    const pool = initPostgresPool();
    
    const query = `
      INSERT INTO messages (telegram_id, message, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;
    
    const result = await pool.query(query, [telegramId, message]);
    console.log('✅ Message saved to own server');
    return result.rows[0];
  } else {
    console.log('💾 Saving message to SUPABASE');
    const { data, error } = await supabase
      .from('messages')
      .insert({
        telegram_id: telegramId,
        message: message,
        created_at: new Date().toISOString(),
      })
      .select();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('✅ Message saved to Supabase');
    return data;
  }
}

// Получение количества пользователей
async function getUsersCount(useOwnServer: boolean) {
  if (useOwnServer) {
    const pool = initPostgresPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } else {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }
}

function initBot(req: VercelRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  console.log('=== Checking environment variables ===');
  console.log('TELEGRAM_BOT_TOKEN exists:', !!token);
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_KEY exists:', !!supabaseKey);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  
  if (!token || !supabaseUrl || !supabaseKey) {
    throw new Error('Missing environment variables');
  }
  
  // Определяем откуда запрос (для роутинга БД)
  const useOwnServer = isRussianIP(req);
  
  // Создаем бота только если его еще нет
  if (!bot) {
    bot = new Telegraf(token);
    
    // Создаем клиент Supabase
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    console.log('✅ Supabase client created');
    
    // Обработчик команды /start
    bot.start(async (ctx) => {
      if (!ctx.from) {
        console.error('No ctx.from in start command');
        return;
      }
      
      const telegramId = ctx.from.id;
      const username = ctx.from.username || '';
      const firstName = ctx.from.first_name || 'Пользователь';
      
      console.log('=== Start command ===');
      console.log('Telegram ID:', telegramId);
      console.log('Username:', username);
      console.log('First name:', firstName);
      
      try {
        await saveUser(telegramId, username, firstName, useOwnServer);
        
        await ctx.reply(
          `Привет, ${firstName}! 👋\n\n` +
          `Добро пожаловать в бота!\n` +
          `Используй /help для списка команд.\n\n` +
          `🌍 Ваш регион: ${useOwnServer ? '🇷🇺 Россия (свой сервер)' : '🌍 Другой (Supabase)'}`
        );
      } catch (err: any) {
        console.error('❌ Error saving user:', err.message);
        await ctx.reply('Произошла ошибка при сохранении данных.');
      }
    });
    
    // Обработчик команды /help
    bot.help(async (ctx) => {
      await ctx.reply(
        `📋 Доступные команды:\n\n` +
        `/start - Начать работу с ботом\n` +
        `/help - Показать это сообщение\n` +
        `/profile - Показать ваш профиль\n` +
        `/test - Проверить подключение к БД\n` +
        `/dbinfo - Информация о текущей БД`
      );
    });
    
    // Команда для проверки какая БД используется
    bot.command('dbinfo', async (ctx) => {
      await ctx.reply(
        `🗄️ Информация о БД:\n\n` +
        `Текущая БД: ${useOwnServer ? '🇷🇺 Собственный сервер (PostgreSQL)' : '🌍 Supabase'}\n` +
        `Host: ${useOwnServer ? process.env.DB_HOST : 'Supabase Cloud'}`
      );
    });
    
    // Тестовая команда для проверки БД
    bot.command('test', async (ctx) => {
      try {
        console.log('=== Testing database connection ===');
        
        const count = await getUsersCount(useOwnServer);
        
        await ctx.reply(
          `✅ БД работает!\n` +
          `Пользователей в базе: ${count}\n` +
          `Используется: ${useOwnServer ? '🇷🇺 Свой сервер' : '🌍 Supabase'}`
        );
      } catch (err: any) {
        console.error('DB test exception:', err);
        await ctx.reply(`❌ Ошибка БД: ${err.message}`);
      }
    });
    
    // Обработчик команды /profile
    bot.command('profile', async (ctx) => {
      if (!ctx.from) {
        await ctx.reply('Не удалось получить информацию о пользователе');
        return;
      }
      
      const telegramId = ctx.from.id;
      
      try {
        const user = await getUser(telegramId, useOwnServer);
        
        if (!user) {
          await ctx.reply('Пользователь не найден. Используйте /start');
          return;
        }
        
        await ctx.reply(
          `👤 Ваш профиль:\n\n` +
          `ID: ${user.telegram_id}\n` +
          `Username: @${user.username || 'не указан'}\n` +
          `Имя: ${user.first_name}\n` +
          `Последний визит: ${new Date(user.last_seen).toLocaleString('ru-RU')}\n\n` +
          `🗄️ БД: ${useOwnServer ? '🇷🇺 Свой сервер' : '🌍 Supabase'}`
        );
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        await ctx.reply(`Произошла ошибка: ${err.message}`);
      }
    });
    
    // Обработчик текстовых сообщений
    bot.on('text', async (ctx) => {
      if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
      
      const text = ctx.message.text;
      const telegramId = ctx.from.id;
      
      // Игнорируем команды
      if (text.startsWith('/')) return;
      
      console.log('Text message from:', telegramId, text);
      
      try {
        await saveMessage(telegramId, text, useOwnServer);
        await ctx.reply(
          `Вы написали: ${text}\n\n` +
          `💾 Сохранено в: ${useOwnServer ? '🇷🇺 Свой сервер' : '🌍 Supabase'}`
        );
      } catch (err: any) {
        console.error('Error saving message:', err);
        await ctx.reply('Ошибка при сохранении сообщения.');
      }
    });
    
    console.log('✅ Bot initialized successfully');
  }
  
  return { bot, supabase, useOwnServer };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== Webhook received ===');
  console.log('Method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  
  if (req.method !== 'POST') {
    console.log('Not a POST request, returning 200');
    return res.status(200).json({ ok: true });
  }
  
  try {
    // Инициализируем бота с определением региона
    const { bot: telegramBot } = initBot(req);
    
    if (!telegramBot) {
      throw new Error('Failed to initialize bot');
    }
    
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid body:', req.body);
      return res.status(200).json({ ok: true });
    }
    
    console.log('Processing update:', JSON.stringify(req.body));
    
    // Обрабатываем update от Telegram
    await telegramBot.handleUpdate(req.body);
    
    console.log('✅ Update processed successfully');
    
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('❌ Error processing update:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(200).json({ ok: true });
  }
}