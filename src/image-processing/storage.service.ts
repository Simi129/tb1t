import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * 💾 Storage Service
 * Управление хранением изображений в Supabase Storage
 */

export interface ScanRecord {
  id?: string;
  user_id: number;
  scan_type: 'ocr' | 'qr' | 'barcode' | 'analysis' | 'document';
  original_image_url: string;
  processed_image_url?: string;
  result_data: any;
  created_at?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName = 'scan-images';

  constructor(private databaseService: DatabaseService) {
    this.logger.log('✅ Storage Service initialized');
  }

  /**
   * 📤 Загрузка изображения в Supabase Storage
   */
  async uploadImage(
    userId: number,
    imageBuffer: Buffer,
    fileName: string,
  ): Promise<string> {
    try {
      this.logger.log(`📤 Uploading image for user ${userId}: ${fileName}`);

      const supabase = this.databaseService.getClient();
      
      // Создаем уникальное имя файла
      const timestamp = Date.now();
      const uniqueFileName = `${userId}/${timestamp}_${fileName}`;

      // Загружаем в Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);

      this.logger.log(`✅ Image uploaded: ${urlData.publicUrl}`);
      
      return urlData.publicUrl;
    } catch (error: any) {
      this.logger.error(`❌ Upload Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📥 Скачивание изображения из Supabase Storage
   */
  async downloadImage(filePath: string): Promise<Buffer> {
    try {
      const supabase = this.databaseService.getClient();

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      this.logger.error(`❌ Download Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🗑️ Удаление изображения из Supabase Storage
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      const supabase = this.databaseService.getClient();

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      this.logger.log(`✅ Image deleted: ${filePath}`);
    } catch (error: any) {
      this.logger.error(`❌ Delete Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 💾 Сохранение записи сканирования в БД
   */
  async saveScanRecord(record: ScanRecord): Promise<ScanRecord | null> {
    const startTime = Date.now();
    
    try {
      const supabase = this.databaseService.getClient();

      const { data, error } = await supabase
        .from('scan_history')
        .insert({
          user_id: record.user_id,
          scan_type: record.scan_type,
          original_image_url: record.original_image_url,
          processed_image_url: record.processed_image_url,
          result_data: record.result_data,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      const queryTime = Date.now() - startTime;
      this.logger.log(`✅ Scan record saved in ${queryTime}ms`);

      if (error) {
        this.logger.error(`❌ Error saving scan record: ${error.message}`);
        return null;
      }

      return data;
    } catch (error: any) {
      this.logger.error(`❌ Error saving scan record: ${error.message}`);
      return null;
    }
  }

  /**
   * 📜 Получение истории сканирований пользователя
   */
  async getUserScanHistory(
    userId: number,
    limit: number = 10,
  ): Promise<ScanRecord[]> {
    try {
      const supabase = this.databaseService.getClient();

      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error(`❌ Error fetching history: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error: any) {
      this.logger.error(`❌ Error fetching history: ${error.message}`);
      return [];
    }
  }

  /**
   * 🔍 Поиск сканирований по типу
   */
  async getScansByType(
    userId: number,
    scanType: ScanRecord['scan_type'],
    limit: number = 10,
  ): Promise<ScanRecord[]> {
    try {
      const supabase = this.databaseService.getClient();

      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', userId)
        .eq('scan_type', scanType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error(`❌ Error fetching scans by type: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error: any) {
      this.logger.error(`❌ Error fetching scans by type: ${error.message}`);
      return [];
    }
  }

  /**
   * 📊 Статистика сканирований пользователя
   */
  async getUserScanStats(userId: number): Promise<any> {
    try {
      const supabase = this.databaseService.getClient();

      const { data, error } = await supabase
        .from('scan_history')
        .select('scan_type')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Подсчитываем статистику
      const stats = {
        total: data?.length || 0,
        ocr: 0,
        qr: 0,
        barcode: 0,
        analysis: 0,
        document: 0,
      };

      data?.forEach((record: any) => {
        if (stats.hasOwnProperty(record.scan_type)) {
          stats[record.scan_type]++;
        }
      });

      return stats;
    } catch (error: any) {
      this.logger.error(`❌ Error fetching stats: ${error.message}`);
      return { total: 0 };
    }
  }

  /**
   * 🗑️ Очистка старых сканирований
   */
  async cleanupOldScans(daysOld: number = 30): Promise<number> {
    try {
      const supabase = this.databaseService.getClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('scan_history')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        throw error;
      }

      const deletedCount = data?.length || 0;
      this.logger.log(`✅ Cleaned up ${deletedCount} old scan records`);

      return deletedCount;
    } catch (error: any) {
      this.logger.error(`❌ Cleanup Error: ${error.message}`);
      return 0;
    }
  }
}