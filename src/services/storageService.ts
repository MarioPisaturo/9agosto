/**
 * Servizio unificato per la gestione dello storage Dropbox
 */

import { DropboxService } from './dropboxService';
import { compressImageForUpload } from '../utils/imageCompression';
import type { Photo } from '../types';

export interface UploadResult {
  success: boolean;
  photo?: Photo;
  error?: string;
  provider: 'dropbox' | 'local';
}

export interface UploadOptions {
  uploaderName?: string;
  description?: string;
  onProgress?: (progress: number) => void;
}

export class StorageService {
  /**
   * Carica una foto su Dropbox
   */
  static async uploadPhoto(
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      uploaderName = 'Ospite',
      description,
      onProgress,
    } = options;

    const processedFile = await compressImageForUpload(file);
    onProgress?.(5);

    try {
      const dropboxResponse = await DropboxService.uploadImage(
        processedFile,
        uploaderName,
        onProgress,
        description
      );

      const photo: Photo = {
        id: dropboxResponse.public_id || `dropbox_${Date.now()}`,
        url: dropboxResponse.secure_url,
        timestamp: new Date(dropboxResponse.created_at || Date.now()).getTime(),
        uploadedBy: uploaderName,
        description,
        publicId: dropboxResponse.public_id,
        width: dropboxResponse.width,
        height: dropboxResponse.height,
        bytes: dropboxResponse.bytes,
      };

      return { success: true, photo, provider: 'dropbox' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
      return {
        success: false,
        error: errorMsg,
        provider: 'dropbox',
      };
    }
  }

  /**
   * Verifica la disponibilità di Dropbox
   */
  static async checkProviderAvailability(): Promise<{
    dropbox: { available: boolean; error?: string };
  }> {
    const results = {
      dropbox: { available: false, error: undefined as string | undefined },
    };

    try {
      const dropboxStatus = await import('../utils/dropboxTokenManager').then(
        module => module.DropboxTokenManager.checkTokenStatus()
      );
      results.dropbox.available = dropboxStatus.isValid;
      if (!dropboxStatus.isValid) {
        results.dropbox.error = dropboxStatus.error;
      }
    } catch {
      results.dropbox.error = 'Errore nel controllo Dropbox';
    }

    return results;
  }

  /**
   * Ottiene il provider consigliato basandosi sulla disponibilità
   */
  static async getRecommendedProvider(): Promise<{
    provider: 'dropbox' | 'none';
    reason: string;
  }> {
    const availability = await this.checkProviderAvailability();

    if (availability.dropbox.available) {
      return {
        provider: 'dropbox',
        reason: 'Dropbox disponibile e configurato correttamente',
      };
    }

    return {
      provider: 'none',
      reason: 'Nessun provider disponibile - configurazione richiesta',
    };
  }

  /**
   * Carica multiple foto in parallelo con gestione degli errori
   */
  static async uploadMultiplePhotos(
    files: File[],
    options: UploadOptions = {}
  ): Promise<{
    successful: UploadResult[];
    failed: Array<{ file: File; error: string }>;
    totalCount: number;
  }> {
    const results = {
      successful: [] as UploadResult[],
      failed: [] as Array<{ file: File; error: string }>,
      totalCount: files.length,
    };

    const BATCH_SIZE = 3;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (file, index) => {
        try {
          const progressCallback = options.onProgress
            ? (progress: number) => {
                const globalProgress = ((i + index) * 100 + progress) / files.length;
                options.onProgress!(globalProgress);
              }
            : undefined;

          const result = await this.uploadPhoto(file, {
            ...options,
            onProgress: progressCallback,
          });

          if (result.success) {
            results.successful.push(result);
          } else {
            results.failed.push({
              file,
              error: result.error || 'Errore sconosciuto',
            });
          }
        } catch (error) {
          results.failed.push({
            file,
            error: error instanceof Error ? error.message : 'Errore sconosciuto',
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }
}
