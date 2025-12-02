import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import { RunwayModule } from './runway/runway.module';
import supabaseConfig from './config/supabase.config';
import telegramConfig from './config/telegram.config';
import geminiConfig from './config/gemini.config';
import runwayConfig from './config/runway.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, telegramConfig, geminiConfig, runwayConfig],
    }),
    TelegramModule,
    DatabaseModule,
    AiModule,
    RunwayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}