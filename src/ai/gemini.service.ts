import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: any;
  private imageModel: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Модель для текста и анализа медиа
    this.textModel = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash' 
    });
    
    // Модель для генерации изображений (Nano Banana)
    this.imageModel = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image' 
    });
    
    this.logger.log('✅ Gemini AI initialized (Text + Image models)');
  }

  /**
   * Анализ текста
   */
  async analyzeText(text: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const result = await this.textModel.generateContent(text);
      const response = await result.response;
      const generatedText = response.text();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Text analyzed in ${processingTime}ms`);
      
      return generatedText;
    } catch (error: any) {
      this.logger.error(`❌ Error analyzing text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Анализ изображения
   */
  async analyzeImage(imageUrl: string, prompt?: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      
      const imageData = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      };

      const textPart = prompt || 'Опиши это изображение подробно';

      const result = await this.textModel.generateContent([textPart, imagePart]);
      const response = await result.response;
      const generatedText = response.text();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Image analyzed in ${processingTime}ms`);
      
      return generatedText;
    } catch (error: any) {
      this.logger.error(`❌ Error analyzing image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Анализ аудио
   */
  async analyzeAudio(audioUrl: string, prompt?: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
      });
      
      const audioData = Buffer.from(audioResponse.data).toString('base64');
      const mimeType = audioResponse.headers['content-type'] || 'audio/mpeg';

      const audioPart = {
        inlineData: {
          data: audioData,
          mimeType: mimeType,
        },
      };

      const textPart = prompt || 'Расшифруй это аудио и опиши его содержание';

      const result = await this.textModel.generateContent([textPart, audioPart]);
      const response = await result.response;
      const generatedText = response.text();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Audio analyzed in ${processingTime}ms`);
      
      return generatedText;
    } catch (error: any) {
      this.logger.error(`❌ Error analyzing audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Анализ видео
   */
  async analyzeVideo(videoUrl: string, prompt?: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
      });
      
      const videoData = Buffer.from(videoResponse.data).toString('base64');
      const mimeType = videoResponse.headers['content-type'] || 'video/mp4';

      const videoPart = {
        inlineData: {
          data: videoData,
          mimeType: mimeType,
        },
      };

      const textPart = prompt || 'Опиши содержание этого видео';

      const result = await this.textModel.generateContent([textPart, videoPart]);
      const response = await result.response;
      const generatedText = response.text();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Video analyzed in ${processingTime}ms`);
      
      return generatedText;
    } catch (error: any) {
      this.logger.error(`❌ Error analyzing video: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🍌 NANO BANANA: Генерация изображения из текстового описания
   */
  async generateImage(prompt: string): Promise<Buffer> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🍌 Generating image: "${prompt.substring(0, 50)}..."`);
      
      const result = await this.imageModel.generateContent([
        {
          text: prompt,
        },
      ]);
      
      const response = await result.response;
      
      let imageData: Buffer | null = null;
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      }
      
      if (!imageData) {
        throw new Error('No image data in response');
      }
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Image generated in ${processingTime}ms`);
      
      return imageData;
    } catch (error: any) {
      this.logger.error(`❌ Error generating image: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🍌 NANO BANANA: Редактирование изображения по описанию
   */
  async editImage(imageUrl: string, editPrompt: string): Promise<Buffer> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🍌 Editing image: "${editPrompt.substring(0, 50)}..."`);
      
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      
      const imageData = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      const result = await this.imageModel.generateContent([
        {
          text: editPrompt,
        },
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType,
          },
        },
      ]);
      
      const response = await result.response;
      
      let editedImageData: Buffer | null = null;
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          editedImageData = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      }
      
      if (!editedImageData) {
        throw new Error('No edited image data in response');
      }
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Image edited in ${processingTime}ms`);
      
      return editedImageData;
    } catch (error: any) {
      this.logger.error(`❌ Error editing image: ${error.message}`);
      throw error;
    }
  }
}