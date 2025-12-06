import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-admin-token';
  private readonly ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map(Number) || [];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Проверяем токен в headers или body
    const token = request.headers['x-admin-token'] || request.body?.adminToken;
    
    if (!token || token !== this.ADMIN_TOKEN) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return true;
  }
}