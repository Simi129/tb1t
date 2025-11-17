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
  const requestStartTime = Date.now();
  
  try {
    console.log('📨 Received request:', req.method, req.url);

    // Только POST запросы от Telegram
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, message: 'Bot is running' });
    }

    const application = await getApp();
    const geoService = application.get(GeoService);
    const telegramService = application.get(TelegramService);

    // Извлекаем реальный IP пользователя
    const realIP = geoService.extractRealIP(req.headers);
    
    // Проверяем, канадский ли это IP
    const isCanadian = geoService.isCanadianIP(realIP);

    console.log(`📍 Client IP: ${realIP}, Is Canadian: ${isCanadian}`);

    // 🇨🇦 Если трафик из Канады - проксируем на VPS
    if (isCanadian) {
      const VPS_URL = process.env.VPS_WEBHOOK_URL;
      
      if (!VPS_URL) {
        console.error('❌ VPS_WEBHOOK_URL not configured in environment variables');
        return res.status(500).json({ 
          ok: false, 
          error: 'VPS_WEBHOOK_URL not configured' 
        });
      }

      console.log(`🔄 Proxying Canadian traffic to VPS: ${VPS_URL}`);
      const proxyStartTime = Date.now();

      try {
        const response = await fetch(VPS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': realIP || 'unknown',
            'X-Original-IP': realIP || 'unknown',
          },
          body: JSON.stringify(req.body),
        });

        const proxyTime = Date.now() - proxyStartTime;
        const totalTime = Date.now() - requestStartTime;
        
        const data = await response.json();
        console.log(
          `✅ VPS response: ${response.status} | Proxy: ${proxyTime}ms | Total: ${totalTime}ms`
        );
        
        return res.status(response.status).json(data);
      } catch (error: any) {
        const proxyTime = Date.now() - proxyStartTime;
        console.error(`❌ Error proxying to VPS (after ${proxyTime}ms): ${error.message}`);
        return res.status(500).json({ 
          ok: false, 
          error: `VPS proxy error: ${error.message}` 
        });
      }
    }

    // 🌐 Обрабатываем через Supabase локально (весь остальной трафик)
    console.log(`✅ Processing with Supabase (non-Canadian traffic)`);
    
    const update = req.body;
    const processingStartTime = Date.now();
    
    // Передаем обновление в Telegraf для обработки команд
    await telegramService.handleUpdate(update);

    const processingTime = Date.now() - processingStartTime;
    const totalTime = Date.now() - requestStartTime;
    
    // Цветовая индикация производительности
    const getEmoji = (ms: number) => {
      if (ms < 100) return '🟢';
      if (ms < 300) return '🟡';
      if (ms < 500) return '🟠';
      return '🔴';
    };
    
    console.log(
      `${getEmoji(totalTime)} Request completed | ` +
      `Processing: ${processingTime}ms | ` +
      `Total: ${totalTime}ms | ` +
      `UpdateID: ${update.update_id}`
    );

    return res.status(200).json({ ok: true });
    
  } catch (error: any) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`❌ Critical error in handler (after ${totalTime}ms):`, error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}