import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.key');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and KEY must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('✅ Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async saveUser(telegramId: number, username: string, firstName: string) {
    try {
      // ИСПРАВЛЕНО: используем upsert с правильным onConflict
      const { data, error } = await this.supabase
        .from('users')
        .upsert(
          {
            telegram_id: telegramId,
            username: username,
            first_name: firstName,
            last_seen: new Date().toISOString(),
          },
          {
            onConflict: 'telegram_id', // указываем по какому полю делать upsert
            ignoreDuplicates: false, // обновляем существующие записи
          }
        )
        .select();

      if (error) {
        // Если все еще ошибка - логируем, но не бросаем исключение
        this.logger.warn(`⚠️ User upsert warning: ${error.message}`);
        return null;
      }
      
      this.logger.log(`✅ User saved/updated: ${telegramId}`);
      return data;
    } catch (error: any) {
      // Ловим ошибку дубликата и просто обновляем запись
      if (error.code === '23505') {
        this.logger.log(`🔄 User already exists, updating: ${telegramId}`);
        
        // Обновляем существующую запись
        const { data, error: updateError } = await this.supabase
          .from('users')
          .update({
            username: username,
            first_name: firstName,
            last_seen: new Date().toISOString(),
          })
          .eq('telegram_id', telegramId)
          .select();

        if (updateError) {
          this.logger.error(`❌ Error updating user: ${updateError.message}`);
          return null;
        }
        
        return data;
      }
      
      this.logger.error(`❌ Error saving user: ${error.message}`);
      // НЕ бросаем ошибку, чтобы не крашить весь процесс
      return null;
    }
  }

  async getUser(telegramId: number) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`❌ Error getting user: ${error.message}`);
        return null;
      }
      
      return data;
    } catch (error: any) {
      this.logger.error(`❌ Error getting user: ${error.message}`);
      return null;
    }
  }

  async saveMessage(telegramId: number, message: string) {
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
      this.logger.log(`✅ Message saved from: ${telegramId}`);
      return data;
    } catch (error: any) {
      this.logger.error(`❌ Error saving message: ${error.message}`);
      // НЕ бросаем ошибку
      return null;
    }
  }
}