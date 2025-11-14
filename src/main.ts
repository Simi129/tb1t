import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Для локальной разработки
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Бот запущен на порту ${port}`);
  console.log(`📝 Окружение: ${process.env.NODE_ENV || 'development'}`);
}

// Запускаем ТОЛЬКО для локальной разработки
// НЕ запускаем на Vercel!
if (require.main === module) {
  bootstrap().catch(err => {
    console.error('Failed to start application:', err);
    process.exit(1);
  });
}