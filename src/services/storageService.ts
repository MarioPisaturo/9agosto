/**
 * Servizio unificato per la gestione di multiple piattaforme di storage
 * Supporta Dropbox, Cloudinary e backup locali
 */

import { DropboxService } from './dropboxService';
import { CloudinaryService } from './cloudinaryService';
import type { Photo } from '../types';

export interface UploadResult {
  success: boolean;
  photo?: Photo;
  error?: string;
  provider: 'dropbox' | 'cloudinary' | 'local';
  fallbackUsed?: boolean;
}

export interface UploadOptions {
  uploaderName?: string;
  description?: string;
  onProgress?: (progress: number) => void;
  preferredProvider?: 'dropbox' | 'cloudinary' | 'auto';
  enableFallback?: boolean;
}

export class StorageService {
  private static readonly FALLBACK_ORDER = ['dropbox', 'cloudinary'] as const;
  
  /**
   * Carica una foto usando il provider preferito con fallback automatico
   */
  static async uploadPhoto(
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      uploaderName = 'Ospite',
      description,
      onProgress,
      preferredProvider = 'auto',
      enableFallback = true,
    } = options;

    // Determina l'ordine dei provider da provare
    const providers = this.getProviderOrder(preferredProvider);
    
    let lastError: string = '';
    
    for (const provider of providers) {
      try {
        console.log(`🚀 Tentativo di upload con ${provider}...`);
        
        const result = await this.uploadWithProvider(
          provider,
          file,
          uploaderName,
          onProgress,
          description
        );
        
        if (result.success && result.photo) {
          console.log(`✅ Upload riuscito con ${provider}`);
          return {
            ...result,
            provider,
            fallbackUsed: provider !== providers[0],
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
        lastError = errorMsg;
        console.warn(`❌ Errore con ${provider}: ${errorMsg}`);
        
        // Se è il primo provider e fallback è disabilitato, esci subito
        if (!enableFallback && provider === providers[0]) {
          return {
            success: false,
            error: errorMsg,
            provider,
          };
        }
        
        // Continua con il prossimo provider
        continue;
      }
    }
    
    // Se arriviamo qui, tutti i provider hanno fallito
    return {
      success: false,
      error: `Tutti i provider hanno fallito. Ultimo errore: ${lastError}`,
      provider: providers[0],
    };
  }

  /**
   * Carica con un provider specifico
   */
  private static async uploadWithProvider(
    provider: 'dropbox' | 'cloudinary',
    file: File,
    uploaderName: string,
    onProgress?: (progress: number) => void,
    description?: string
  ): Promise<UploadResult> {
    switch (provider) {
      case 'dropbox':
        try {
          const dropboxResponse = await DropboxService.uploadImage(
            file,
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
          throw error;
        }
        
      case 'cloudinary':
        try {
          const cloudinaryResponse = await CloudinaryService.uploadImage(
            file,
            uploaderName,
            onProgress
          );
          
          const photo: Photo = {
            id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
            timestamp: new Date(cloudinaryResponse.created_at).getTime(),
            uploadedBy: uploaderName,
            description,
            publicId: cloudinaryResponse.public_id,
            width: cloudinaryResponse.width,
            height: cloudinaryResponse.height,
            bytes: cloudinaryResponse.bytes,
          };
          
          return { success: true, photo, provider: 'cloudinary' };
        } catch (error) {
          throw error;
        }
        
      default:
        throw new Error(`Provider non supportato: ${provider}`);
    }
  }

  /**
   * Determina l'ordine dei provider da utilizzare
   */
  private static getProviderOrder(
    preferred: 'dropbox' | 'cloudinary' | 'auto'
  ): Array<'dropbox' | 'cloudinary'> {
    switch (preferred) {
      case 'dropbox':
        return ['dropbox', 'cloudinary'];
      case 'cloudinary':
        return ['cloudinary', 'dropbox'];
      case 'auto':
      default:
        return [...this.FALLBACK_ORDER];
    }
  }

  /**
   * Verifica la disponibilità dei provider
   */
  static async checkProviderAvailability(): Promise<{
    dropbox: { available: boolean; error?: string };
    cloudinary: { available: boolean; error?: string };
  }> {
    const results = {
      dropbox: { available: false, error: undefined as string | undefined },
      cloudinary: { available: false, error: undefined as string | undefined },
    };

    // Test Dropbox
    try {
      const dropboxStatus = await import('../utils/dropboxTokenManager').then(
        module => module.DropboxTokenManager.checkTokenStatus()
      );
      results.dropbox.available = dropboxStatus.isValid;
      if (!dropboxStatus.isValid) {
        results.dropbox.error = dropboxStatus.error;
      }
    } catch (error) {
      results.dropbox.error = 'Errore nel controllo Dropbox';
    }

    // Test Cloudinary
    try {
      const cloudinaryTest = await CloudinaryService.testConnection();
      results.cloudinary.available = cloudinaryTest.success;
      if (!cloudinaryTest.success) {
        results.cloudinary.error = cloudinaryTest.error;
      }
    } catch (error) {
      results.cloudinary.error = 'Errore nel controllo Cloudinary';
    }

    return results;
  }

  /**
   * Ottiene il provider consigliato basandosi sulla disponibilità
   */
  static async getRecommendedProvider(): Promise<{
    provider: 'dropbox' | 'cloudinary' | 'none';
    reason: string;
  }> {
    const availability = await this.checkProviderAvailability();
    
    if (availability.dropbox.available) {
      return {
        provider: 'dropbox',
        reason: 'Dropbox disponibile e configurato correttamente',
      };
    }
    
    if (availability.cloudinary.available) {
      return {
        provider: 'cloudinary',
        reason: 'Cloudinary disponibile come alternativa',
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

    // Carica le foto in parallelo (massimo 3 alla volta per non sovraccaricare)
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (file, index) => {
        try {
          const progressCallback = options.onProgress 
            ? (progress: number) => {
                // Calcola il progresso globale
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