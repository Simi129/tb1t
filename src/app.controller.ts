import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Health check для Railway
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      env: process.env.NODE_ENV || 'production',
    };
  }

  // Для проверки, что бот работает
  @Get('status')
  getStatus() {
    return {
      bot: 'running',
      version: '1.0.0',
      platform: 'Railway',
      timestamp: new Date().toISOString(),
    };
  }
}