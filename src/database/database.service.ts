import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(DatabaseService.name);
  
  // Статистика БД
  private dbStats = {
    queries: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
  };

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

  private logQuery(operation: string, time: number) {
    this.dbStats.queries++;
    this.dbStats.totalTime += time;
    this.dbStats.minTime = Math.min(this.dbStats.minTime, time);
    this.dbStats.maxTime = Math.max(this.dbStats.maxTime, time);
    
    const emoji = time < 50 ? '🟢' : time < 150 ? '🟡' : '🔴';
    this.logger.log(`${emoji} DB ${operation}: ${time}ms`);
  }

  getStats() {
    return {
      ...this.dbStats,
      avgTime: this.dbStats.queries > 0 
        ? Math.round(this.dbStats.totalTime / this.dbStats.queries) 
        : 0,
    };
  }

  async saveUser(telegramId: number, username: string, firstName: string) {
    const startTime = Date.now();
    
    try {
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
            onConflict: 'telegram_id',
            ignoreDuplicates: false,
          }
        )
        .select();

      const queryTime = Date.now() - startTime;
      this.logQuery('saveUser', queryTime);

      if (error) {
        this.logger.warn(`⚠️ User upsert warning: ${error.message}`);
        return null;
      }
      
      this.logger.log(`✅ User saved/updated: ${telegramId}`);
      return data;
    } catch (error: any) {
      const queryTime = Date.now() - startTime;
      this.logQuery('saveUser(error)', queryTime);
      
      if (error.code === '23505') {
        this.logger.log(`🔄 User already exists, updating: ${telegramId}`);
        
        const updateStart = Date.now();
        const { data, error: updateError } = await this.supabase
          .from('users')
          .update({
            username: username,
            first_name: firstName,
            last_seen: new Date().toISOString(),
          })
          .eq('telegram_id', telegramId)
          .select();

        const updateTime = Date.now() - updateStart;
        this.logQuery('updateUser', updateTime);

        if (updateError) {
          this.logger.error(`❌ Error updating user: ${updateError.message}`);
          return null;
        }
        
        return data;
      }
      
      this.logger.error(`❌ Error saving user: ${error.message}`);
      return null;
    }
  }

  async getUser(telegramId: number) {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      const queryTime = Date.now() - startTime;
      this.logQuery('getUser', queryTime);

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`❌ Error getting user: ${error.message}`);
        return null;
      }
      
      return data;
    } catch (error: any) {
      const queryTime = Date.now() - startTime;
      this.logQuery('getUser(error)', queryTime);
      
      this.logger.error(`❌ Error getting user: ${error.message}`);
      return null;
    }
  }

  async saveMessage(telegramId: number, message: string) {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          telegram_id: telegramId,
          message: message,
          created_at: new Date().toISOString(),
        })
        .select();

      const queryTime = Date.now() - startTime;
      this.logQuery('saveMessage', queryTime);

      if (error) throw error;
      this.logger.log(`✅ Message saved from: ${telegramId}`);
      return data;
    } catch (error: any) {
      const queryTime = Date.now() - startTime;
      this.logQuery('saveMessage(error)', queryTime);
      
      this.logger.error(`❌ Error saving message: ${error.message}`);
      return null;
    }
  }
}