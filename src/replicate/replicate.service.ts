import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';
import axios from 'axios';

export interface ReplicateVideoOptions {
  prompt: string;
  imageUrl?: string;
}

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly replicate: Replicate;

  constructor(private configService: ConfigService) {
    const apiToken = this.configService.get<string>('replicate.apiKey');

    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN is required for video generation');
    }

    this.replicate = new Replicate({
      auth: apiToken,
    });

    this.logger.log('✅ Replicate API initialized with MiniMax video-01');
  }

  async generateVideo(options: ReplicateVideoOptions): Promise<string> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🎬 Starting video generation: "${options.prompt.substring(0, 50)}..."`);

      const input: any = {
        prompt: options.prompt,
      };

      // Если есть изображение - Image-to-Video
      if (options.imageUrl) {
        input.first_frame_image = options.imageUrl;
        this.logger.debug(`Using image URL: ${options.imageUrl}`);
      }

      this.logger.debug(`Creating prediction for minimax/video-01...`);

      // Создаем предсказание
      const prediction = await this.replicate.predictions.create({
        version: "minimax/video-01",
        input: input,
      });

      this.logger.log(`⏳ Prediction created: ${prediction.id}, waiting for completion...`);

      // Ждем завершения
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 попыток × 5 секунд = 5 минут

      while (!completed && attempts < maxAttempts) {
        attempts++;
        
        // Ждем 5 секунд перед проверкой
        await this.sleep(5000);

        // Получаем статус
        const current = await this.replicate.predictions.get(prediction.id);

        this.logger.debug(`📊 Attempt ${attempts}/${maxAttempts}: Status = ${current.status}`);

        if (current.status === 'succeeded') {
          completed = true;
          const processingTime = Date.now() - startTime;

          // Получаем URL видео
          let videoUrl: string;
          if (Array.isArray(current.output)) {
            videoUrl = current.output[0];
          } else if (typeof current.output === 'string') {
            videoUrl = current.output;
          } else {
            throw new Error(`Unexpected output format: ${JSON.stringify(current.output)}`);
          }

          this.logger.log(`✅ Video generated successfully in ${(processingTime / 1000).toFixed(1)}s: ${videoUrl}`);
          return videoUrl;
        } else if (current.status === 'failed') {
          throw new Error(`Prediction failed: ${current.error || 'Unknown error'}`);
        } else if (current.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }

        // Статус processing или starting - продолжаем ждать
      }

      throw new Error(`Prediction timed out after ${maxAttempts} attempts (${(maxAttempts * 5 / 60).toFixed(1)} minutes)`);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Error generating video (${processingTime}ms): ${error.message}`, error.stack);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadVideo(videoUrl: string): Promise<Buffer> {
    try {
      this.logger.log(`📥 Downloading video from: ${videoUrl}`);

      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const buffer = Buffer.from(response.data);
      this.logger.log(`✅ Video downloaded: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

      return buffer;
    } catch (error: any) {
      this.logger.error(`❌ Error downloading video: ${error.message}`);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }
}