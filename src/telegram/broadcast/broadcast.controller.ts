import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  UseGuards,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { BroadcastOptions } from './broadcast.types';
import { AdminGuard } from './guards/admin.guard';

interface SendBroadcastDto {
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  buttons?: {
    text: string;
    url?: string;
    callback_data?: string;
  }[][];
  imageUrl?: string;
  videoUrl?: string;
  targetSegment?: 'all' | 'subscribed' | 'free' | 'premium';
  scheduledFor?: string; // ISO date string
  adminToken: string; // для простой авторизации
}

interface TestBroadcastDto {
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  buttons?: {
    text: string;
    url?: string;
    callback_data?: string;
  }[][];
  adminIds: number[];
  adminToken: string;
}

@Controller('broadcast')
export class BroadcastController {
  // Список админов (в продакшене лучше хранить в БД или env)
  private readonly ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map(Number) || [];
  private readonly ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-admin-token';

  constructor(private broadcastService: BroadcastService) {}

  /**
   * Отправить рассылку
   * POST /broadcast/send
   */
  @Post('send')
  async sendBroadcast(@Body() dto: SendBroadcastDto) {
    // Проверка админского токена
    if (dto.adminToken !== this.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      const options: BroadcastOptions = {
        message: dto.message,
        parseMode: dto.parseMode,
        buttons: dto.buttons,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        targetSegment: dto.targetSegment,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      };

      const result = await this.broadcastService.sendBroadcast(options);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to send broadcast',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Тестовая рассылка (только админам)
   * POST /broadcast/test
   */
  @Post('test')
  async sendTestBroadcast(@Body() dto: TestBroadcastDto) {
    // Проверка админского токена
    if (dto.adminToken !== this.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      const options: BroadcastOptions = {
        message: dto.message,
        parseMode: dto.parseMode,
        buttons: dto.buttons,
      };

      await this.broadcastService.sendTestBroadcast(dto.adminIds, options);

      return {
        success: true,
        message: `Test broadcast sent to ${dto.adminIds.length} admins`,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to send test broadcast',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить историю рассылок
   * GET /broadcast/history?limit=10
   */
  @Get('history')
  async getBroadcastHistory(@Query('limit') limit?: string) {
    try {
      const history = await this.broadcastService.getBroadcastHistory(
        limit ? parseInt(limit) : 10,
      );

      return {
        success: true,
        data: history,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get broadcast history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить статистику конкретной рассылки
   * GET /broadcast/stats/:id
   */
  @Get('stats/:id')
  async getBroadcastStats(@Param('id') id: string) {
    try {
      const stats = await this.broadcastService.getBroadcastStats(id);

      if (!stats) {
        throw new HttpException('Broadcast not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get broadcast stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Хелс-чек
   * GET /broadcast/health
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Broadcast service is running',
      timestamp: new Date().toISOString(),
    };
  }
}