import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

let app: any;

async function bootstrap() {
  if (!app) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] }
    );
    await nestApp.init();
    app = expressApp;
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await bootstrap();
  return server(req, res);
}