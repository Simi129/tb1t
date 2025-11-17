import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
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

    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, message: 'Bot is running' });
    }

    const application = await getApp();
    const telegramService = application.get(TelegramService);

    const update = req.body;
    const processingStartTime = Date.now();
    
    await telegramService.handleUpdate(update);

    const processingTime = Date.now() - processingStartTime;
    const totalTime = Date.now() - requestStartTime;
    
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
    console.error(`❌ Critical error (after ${totalTime}ms):`, error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}