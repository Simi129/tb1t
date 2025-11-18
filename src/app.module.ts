import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import supabaseConfig from './config/supabase.config';
import telegramConfig from './config/telegram.config';
import geminiConfig from './config/gemini.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, telegramConfig, geminiConfig],
    }),
    TelegramModule,
    DatabaseModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}