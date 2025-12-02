import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface RunwayVideoOptions {
  prompt: string;
  videoUrl: string;
  callBackUrl?: string;
  watermark?: string;
  uploadCn?: boolean;
  aspectRatio?: '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9';
  seed?: number;
  referenceImageUrl?: string;
}

export interface RunwayTaskResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
  };
}

export interface RunwayTaskStatus {
  code: number;
  message: string;
  data: {
    taskId: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    videoUrl?: string;
    thumbnailUrl?: string;
    progress?: number;
    error?: string;
    createdAt: string;
    updatedAt: string;
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
      this.logger.debug(`Video URL: ${options.videoUrl}`);

      const requestBody = {
        prompt: options.prompt,
        videoUrl: options.videoUrl,
        ...(options.callBackUrl && { callBackUrl: options.callBackUrl }),
        ...(options.watermark && { watermark: options.watermark }),
        ...(options.uploadCn !== undefined && { uploadCn: options.uploadCn }),
        ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
        ...(options.seed && { seed: options.seed }),
        ...(options.referenceImageUrl && { referenceImageUrl: options.referenceImageUrl }),
      };

      const response = await this.apiClient.post<RunwayTaskResponse>(
        '/runway/aleph/generate',
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
          `Runway API error: ${error.response.data?.message || error.response.statusText}`
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
        `/runway/aleph/task/${taskId}`
      );

      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        this.logger.debug(`📊 Task ${taskId} status: ${taskData.status}`);
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
          `Failed to check task status: ${error.response.data?.message || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  async waitForCompletion(
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<RunwayTaskStatus['data']> {
    this.logger.log(`⏳ Waiting for task ${taskId} to complete (max ${maxAttempts} attempts)`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'SUCCESS') {
        this.logger.log(`✅ Task ${taskId} completed successfully after ${attempt} attempts`);
        return status;
      }

      if (status.status === 'FAILED') {
        this.logger.error(`❌ Task ${taskId} failed: ${status.error}`);
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
      }

      const progressInfo = status.progress ? ` (${status.progress}%)` : '';
      this.logger.debug(
        `⏳ Task ${taskId} still ${status.status}${progressInfo} - Attempt ${attempt}/${maxAttempts}`
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

    if (!result.videoUrl) {
      throw new Error('Video URL not found in completed task');
    }

    return result.videoUrl;
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