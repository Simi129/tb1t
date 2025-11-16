import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { GeoService } from '../src/utils/geo.service';
import { TelegramService } from '../src/telegram/telegram.service';

let app: INestApplication;

async function getApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    console.log('📨 Received request:', req.method);

    // Только POST запросы от Telegram
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, message: 'Bot is running' });
    }

    const application = await getApp();
    const geoService = application.get(GeoService);
    const telegramService = application.get(TelegramService);

    // Извлекаем реальный IP
    const realIP = geoService.extractRealIP(req.headers);
    const isCanadian = geoService.isRussianIP(realIP); // используем существующий метод

    console.log(`📍 IP: ${realIP}, Canadian: ${isCanadian}`);

    // 🇨🇦 Если трафик из Канады - проксируем на VPS
    if (isCanadian) {
      const VPS_URL = process.env.VPS_WEBHOOK_URL;
      
      if (!VPS_URL) {
        console.error('❌ VPS_WEBHOOK_URL not configured');
        return res.status(500).json({ 
          ok: false, 
          error: 'VPS_WEBHOOK_URL not configured' 
        });
      }

      console.log(`🔄 Proxying to VPS: ${VPS_URL}`);

      const response = await fetch(VPS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': realIP || 'unknown',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // ✅ Обрабатываем через Supabase локально
    console.log(`✅ Processing with Supabase`);
    
    const update = req.body;
    
    // КРИТИЧНО! Передаем обновление в Telegraf для обработки команд
    await telegramService.handleUpdate(update);

    return res.status(200).json({ ok: true });
    
  } catch (error: any) {
    console.error('❌ Error in handler:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}