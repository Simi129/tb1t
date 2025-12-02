import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Railway автоматически устанавливает PORT
  const port = process.env.PORT || 3000;
  
  // ВАЖНО: 0.0.0.0 необходимо для Railway
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Бот запущен на порту ${port}`);
  console.log(`📝 Окружение: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Railway URL: https://tb1t-production.up.railway.app`);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📛 SIGTERM получен, завершаем работу...');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('📛 SIGINT получен, завершаем работу...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  console.error('❌ Критическая ошибка запуска:', err);
  process.exit(1);
});