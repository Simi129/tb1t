import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

// Для Vercel Serverless Functions с правильной типизацией
const server: Express = express();

export const createNestServer = async (expressInstance: Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors();
  
  return app.init();
};

// Для локальной разработки
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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

// Запуск для локальной разработки
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

// Экспорт для Vercel
createNestServer(server)
  .then(() => console.log('Nest Ready for Vercel'))
  .catch((err) => console.error('Nest broken', err));

export default server;