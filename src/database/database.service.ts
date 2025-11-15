import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PostgresService } from './postgres.service';
import { GeoService } from '../utils/geo.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(DatabaseService.name);
  private currentIP: string | null = null; // изменено на string | null

  constructor(
    private configService: ConfigService,
    private postgresService: PostgresService,
    private geoService: GeoService,
  ) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.key');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and KEY must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase client initialized');
  }

  /**
   * Устанавливает IP адрес для текущего запроса
   * Вызывай этот метод в начале обработки каждого update от Telegram
   */
  setRequestIP(ip: string | null) {
    this.currentIP = ip;
  }

  /**
   * Определяет, какую БД использовать на основе IP
   */
  private shouldUseOwnServer(): boolean {
    if (!this.currentIP) {
      this.logger.warn('IP not set, defaulting to Supabase');
      return false;
    }
    return this.geoService.isRussianIP(this.currentIP);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async saveUser(telegramId: number, username: string, firstName: string) {
    const useOwnServer = this.shouldUseOwnServer();
    
    if (useOwnServer) {
      this.logger.log(`Routing to OWN SERVER for user: ${telegramId}`);
      return await this.postgresService.saveUser(telegramId, username, firstName);
    } else {
      this.logger.log(`Routing to SUPABASE for user: ${telegramId}`);
      try {
        const { data, error } = await this.supabase
          .from('users')
          .upsert({
            telegram_id: telegramId,
            username: username,
            first_name: firstName,
            last_seen: new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        this.logger.log(`User saved to Supabase: ${telegramId}`);
        return data;
      } catch (error: any) {
        this.logger.error(`Error saving user to Supabase: ${error.message}`);
        throw error;
      }
    }
  }

  async getUser(telegramId: number) {
    const useOwnServer = this.shouldUseOwnServer();
    
    if (useOwnServer) {
      this.logger.log(`Routing to OWN SERVER for get user: ${telegramId}`);
      return await this.postgresService.getUser(telegramId);
    } else {
      this.logger.log(`Routing to SUPABASE for get user: ${telegramId}`);
      try {
        const { data, error } = await this.supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
      } catch (error: any) {
        this.logger.error(`Error getting user from Supabase: ${error.message}`);
        throw error;
      }
    }
  }

  async saveMessage(telegramId: number, message: string) {
    const useOwnServer = this.shouldUseOwnServer();
    
    if (useOwnServer) {
      this.logger.log(`Routing to OWN SERVER for message from: ${telegramId}`);
      return await this.postgresService.saveMessage(telegramId, message);
    } else {
      this.logger.log(`Routing to SUPABASE for message from: ${telegramId}`);
      try {
        const { data, error } = await this.supabase
          .from('messages')
          .insert({
            telegram_id: telegramId,
            message: message,
            created_at: new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        this.logger.log(`Message saved to Supabase from user: ${telegramId}`);
        return data;
      } catch (error: any) {
        this.logger.error(`Error saving message to Supabase: ${error.message}`);
        throw error;
      }
    }
  }
}