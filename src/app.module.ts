import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module';
import { DatabaseModule } from './database/database.module';
import supabaseConfig from './config/supabase.config';
import telegramConfig from './config/telegram.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, telegramConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    // ❌ УБРАЛИ TelegrafModule - он запускал polling и конфликтовал с webhook!
    // TelegrafModule используется только для декораторов, но сам модуль не нужен
    DatabaseModule,
    TelegramModule,
  ],
})
export class AppModule {}