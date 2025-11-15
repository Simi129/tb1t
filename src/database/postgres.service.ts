import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private configService: ConfigService,
  ) {}

  async saveUser(telegramId: number, username: string, firstName: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_id: telegramId },
      });

      if (user) {
        user.username = username;
        user.first_name = firstName;
        user.last_seen = new Date();
        const saved = await this.userRepository.save(user);
        this.logger.log(`User updated: ${telegramId}`);
        return saved;
      } else {
        const newUser = this.userRepository.create({
          telegram_id: telegramId,
          username: username,
          first_name: firstName,
          last_seen: new Date(),
        });
        const saved = await this.userRepository.save(newUser);
        this.logger.log(`User created: ${telegramId}`);
        return saved;
      }
    } catch (error) {
      this.logger.error(`Error saving user: ${error.message}`);
      throw error;
    }
  }

  async getUser(telegramId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_id: telegramId },
      });
      return user;
    } catch (error) {
      this.logger.error(`Error getting user: ${error.message}`);
      throw error;
    }
  }

  async saveMessage(telegramId: number, message: string) {
    try {
      const newMessage = this.messageRepository.create({
        telegram_id: telegramId,
        message: message,
        created_at: new Date(),
      });
      const saved = await this.messageRepository.save(newMessage);
      this.logger.log(`Message saved from user: ${telegramId}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
      throw error;
    }
  }
}