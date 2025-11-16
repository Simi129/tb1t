import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  /**
   * Проверяет, является ли IP адрес канадским (ДЛЯ ТЕСТА)
   */
  isRussianIP(ip: string | null): boolean {
    if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
      this.logger.warn('⚠️ Local IP detected, defaulting to Supabase');
      return false;
    }

    try {
      const geo = geoip.lookup(ip);
      
      if (!geo) {
        this.logger.warn(`⚠️ Could not determine location for IP: ${ip}, defaulting to Supabase`);
        return false; // по умолчанию используем Supabase
      }

      // 🇨🇦 ВРЕМЕННО: Канада → VPS (для теста)
      const isCanadian = geo.country === 'CA';
      
      this.logger.log(
        `🌍 IP: ${ip} | Country: ${geo.country} | Region: ${geo.region} | ` +
        `Routing to: ${isCanadian ? '🇨🇦 VPS' : '🌐 Supabase'}`
      );
      
      return isCanadian;
    } catch (error) {
      this.logger.error(`❌ Error in geo lookup: ${error.message}`);
      return false; // при ошибке используем Supabase
    }
  }

  /**
   * Извлекает реальный IP из заголовков запроса (для Vercel)
   */
  extractRealIP(headers: any): string | null {
    // Vercel передает реальный IP в заголовке x-real-ip или x-forwarded-for
    const xRealIp = headers['x-real-ip'];
    const xForwardedFor = headers['x-forwarded-for'];
    
    if (xRealIp) {
      this.logger.log(`📍 Real IP from x-real-ip: ${xRealIp}`);
      return xRealIp;
    }
    
    if (xForwardedFor) {
      // x-forwarded-for может содержать несколько IP через запятую
      const ips = xForwardedFor.split(',');
      const firstIp = ips[0].trim();
      this.logger.log(`📍 Real IP from x-forwarded-for: ${firstIp}`);
      return firstIp;
    }
    
    this.logger.warn('⚠️ No real IP found in headers');
    return null;
  }
}