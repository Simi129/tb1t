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

      this.logger.debug(`Running minimax/video-01 model...`);

      // Запускаем модель
      const output = await this.replicate.run(
        "minimax/video-01" as any,
        { input }
      );

      const processingTime = Date.now() - startTime;

      // output - это либо строка (URL), либо массив
      let videoUrl: string;
      if (Array.isArray(output)) {
        videoUrl = output[0];
      } else if (typeof output === 'string') {
        videoUrl = output;
      } else {
        throw new Error(`Unexpected output format: ${JSON.stringify(output)}`);
      }

      this.logger.log(`✅ Video generated successfully in ${(processingTime / 1000).toFixed(1)}s: ${videoUrl}`);
      
      return videoUrl;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Error generating video (${processingTime}ms): ${error.message}`, error.stack);
      throw new Error(`Video generation failed: ${error.message}`);
    }
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