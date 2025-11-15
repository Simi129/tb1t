import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './telegram/telegram.module';
import { DatabaseModule } from './database/database.module';
import supabaseConfig from './config/supabase.config';
import telegramConfig from './config/telegram.config';
import databaseConfig from './config/database.config'; // ДОБАВИТЬ

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, telegramConfig, databaseConfig], // ДОБАВИТЬ databaseConfig
      envFilePath: ['.env.local', '.env'],
    }),
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('telegram.token');
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN must be provided');
        }
        return {
          token,
        };
      },
    }),
    DatabaseModule,
    TelegramModule,
  ],
})
export class AppModule {}