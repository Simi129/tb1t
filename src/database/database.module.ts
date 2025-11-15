import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { PostgresService } from './postgres.service';
import { GeoService } from '../utils/geo.service';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';

@Module({
  imports: [
    // Настройка подключения к твоей БД (для российского трафика)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || '',
        database: configService.get<string>('DB_NAME') || 'postgres',
        entities: [User, Message],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([User, Message]),
  ],
  providers: [DatabaseService, PostgresService, GeoService],
  exports: [DatabaseService],
})
export class DatabaseModule {}