import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface RunwayVideoOptions {
  prompt: string;
  imageUrl?: string;
  duration?: 5 | 10;
  quality?: '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9';
  waterMark?: string;
  callBackUrl?: string;
}

export interface RunwayTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface RunwayTaskStatus {
  code: number;
  msg: string;
  data: {
    taskId: string;
    state: 'wait' | 'queueing' | 'generating' | 'success' | 'fail';
    generateTime?: string;
    videoInfo?: {
      videoId: string;
      videoUrl: string;
      imageUrl: string;
    };
    expireFlag?: number;
    failMsg?: string;
  };
}

@Injectable()
export class RunwayService {
  private readonly logger = new Logger(RunwayService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('runway.apiKey');
    const baseUrl = this.configService.get<string>('runway.baseUrl');

    if (!apiKey) {
      throw new Error('KIE_API_KEY is required for Runway integration');
    }

    if (!baseUrl) {
      throw new Error('Runway base URL is not configured');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.logger.log('✅ Runway API initialized via Kie service');
  }

  async generateVideo(options: RunwayVideoOptions): Promise<string> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🎬 Starting video generation: "${options.prompt.substring(0, 50)}..."`);

      const requestBody: any = {
        prompt: options.prompt,
        duration: options.duration || 5,
        quality: options.quality || '720p',
        aspectRatio: options.aspectRatio || '16:9',
        waterMark: options.waterMark || '',
      };

      if (options.imageUrl) {
        requestBody.imageUrl = options.imageUrl;
        this.logger.debug(`Using image URL: ${options.imageUrl}`);
      }

      if (options.callBackUrl) {
        requestBody.callBackUrl = options.callBackUrl;
      }

      this.logger.debug(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await this.apiClient.post<RunwayTaskResponse>(
        '/generate',
        requestBody
      );

      const processingTime = Date.now() - startTime;

      if (response.data.code === 200 && response.data.data?.taskId) {
        const taskId = response.data.data.taskId;
        this.logger.log(`✅ Task created successfully in ${processingTime}ms: ${taskId}`);
        return taskId;
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      if (error.response) {
        this.logger.error(
          `❌ Runway API error (${processingTime}ms): ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
        throw new Error(
          `Runway API error: ${error.response.data?.msg || error.response.statusText}`
        );
      } else if (error.request) {
        this.logger.error(`❌ Network error (${processingTime}ms): No response from Runway API`);
        throw new Error('Network error: Could not reach Runway API');
      } else {
        this.logger.error(`❌ Error (${processingTime}ms): ${error.message}`);
        throw error;
      }
    }
  }

  async getTaskStatus(taskId: string): Promise<RunwayTaskStatus['data']> {
    try {
      this.logger.debug(`🔍 Checking task status: ${taskId}`);

      const response = await this.apiClient.get<RunwayTaskStatus>(
        `/record-detail?taskId=${taskId}`
      );

      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        this.logger.debug(`📊 Task ${taskId} status: ${taskData.state}`);
        return taskData;
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      if (error.response) {
        this.logger.error(
          `❌ Error checking task status: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
        throw new Error(
          `Failed to check task status: ${error.response.data?.msg || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  async waitForCompletion(
    taskId: string,
    maxAttempts: number = 40,
    intervalMs: number = 30000
  ): Promise<RunwayTaskStatus['data']> {
    this.logger.log(`⏳ Waiting for task ${taskId} to complete (max ${maxAttempts} attempts, checking every 30s)`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.getTaskStatus(taskId);

      if (status.state === 'success') {
        this.logger.log(`✅ Task ${taskId} completed successfully after ${attempt} attempts`);
        return status;
      }

      if (status.state === 'fail') {
        this.logger.error(`❌ Task ${taskId} failed: ${status.failMsg}`);
        throw new Error(`Video generation failed: ${status.failMsg || 'Unknown error'}`);
      }

      this.logger.debug(
        `⏳ Task ${taskId} status: ${status.state} - Attempt ${attempt}/${maxAttempts}`
      );

      if (attempt < maxAttempts) {
        await this.sleep(intervalMs);
      }
    }

    throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`);
  }

  async generateAndWaitForVideo(options: RunwayVideoOptions): Promise<string> {
    const taskId = await this.generateVideo(options);
    const result = await this.waitForCompletion(taskId);

    if (!result.videoInfo?.videoUrl) {
      throw new Error('Video URL not found in completed task');
    }

    return result.videoInfo.videoUrl;
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