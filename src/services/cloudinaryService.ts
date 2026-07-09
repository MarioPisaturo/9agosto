import imageCompression from "browser-image-compression";
import { CLOUDINARY_CONFIG } from "../config/cloudinary";

export interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

export class CloudinaryService {
  private static readonly MAX_FILE_SIZE_MB = CLOUDINARY_CONFIG.MAX_FILE_SIZE_MB;
  private static readonly MAX_FILE_SIZE_BYTES =
    CLOUDINARY_CONFIG.MAX_FILE_SIZE_BYTES;

  /**
   * Comprimi un'immagine se è troppo grande
   */
  static async compressImage(file: File): Promise<File> {
    // Se il file è già sotto i 2MB, non comprimere
    if (file.size <= 2 * 1024 * 1024) {
      return file;
    }

    const options = {
      maxSizeMB: 2, // Comprimi a massimo 2MB
      maxWidthOrHeight: 1920, // Risoluzione massima 1920px
      useWebWorker: true,
      fileType: "image/jpeg", // Converti sempre in JPEG per dimensioni minori
      quality: 0.8, // Qualità 80%
    };

    try {
      console.log("🗜️ Comprimendo immagine...", {
        originalSize: (file.size / 1024 / 1024).toFixed(2) + "MB",
        fileName: file.name,
      });

      const compressedFile = await imageCompression(file, options);

      console.log("✅ Compressione completata", {
        originalSize: (file.size / 1024 / 1024).toFixed(2) + "MB",
        compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + "MB",
        reduction:
          (((file.size - compressedFile.size) / file.size) * 100).toFixed(1) +
          "%",
      });

      return compressedFile;
    } catch (error) {
      console.error("❌ Errore durante la compressione:", error);
      throw new Error("Errore durante la compressione dell'immagine");
    }
  }

  /**
   * Valida un file prima del caricamento
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Controlla il tipo di file
    if (!file.type.startsWith("image/")) {
      return { isValid: false, error: "Il file deve essere un'immagine" };
    }

    // Controlla la dimensione
    if (file.size > CloudinaryService.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Il file è troppo grande. Dimensione massima: ${CloudinaryService.MAX_FILE_SIZE_MB}MB`,
      };
    }

    // Controlla i formati supportati
    if (!CLOUDINARY_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
      return {
        isValid: false,
        error: "Formato non supportato. Usa JPG, PNG o WebP",
      };
    }

    return { isValid: true };
  }

  /**
   * Carica un'immagine su Cloudinary
   */
  static async uploadImage(
    file: File,
    uploadedBy?: string,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryResponse> {
    // Valida il file
    const validation = CloudinaryService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Comprimi l'immagine se necessario
    const processedFile = await CloudinaryService.compressImage(file);

    // Prepara i dati per il caricamento
    const formData = new FormData();
    formData.append("file", processedFile);
    formData.append("upload_preset", CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append("folder", CLOUDINARY_CONFIG.FOLDER);

    // Aggiungi metadati
    const context = {
      uploadedBy: uploadedBy || "Anonimo",
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    };
    formData.append(
      "context",
      Object.entries(context)
        .map(([k, v]) => `${k}=${v}`)
        .join("|")
    );

    // Aggiungi tag per organizzare le foto
    formData.append("tags", CLOUDINARY_CONFIG.TAGS.join(","));

    try {
      console.log("📤 Caricando foto su Cloudinary...");

      // Crea una Promise con supporto per il progresso
      const uploadPromise = new Promise<CloudinaryResponse>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Gestione del progresso
          if (onProgress) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
              }
            };
          }

          // Gestione della risposta
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log(
                  "✅ Foto caricata con successo:",
                  response.secure_url
                );
                resolve(response);
              } catch (parseError) {
                console.error("Errore nel parsing della risposta:", parseError);
                reject(new Error("Errore nel parsing della risposta"));
              }
            } else {
              reject(new Error(`Errore HTTP: ${xhr.status}`));
            }
          };

          xhr.onerror = () =>
            reject(new Error("Errore di rete durante il caricamento"));
          xhr.ontimeout = () =>
            reject(new Error("Timeout durante il caricamento"));

          // Configura la richiesta
          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`
          );
          xhr.timeout = 30000; // 30 secondi di timeout
          xhr.send(formData);
        }
      );

      const result = await uploadPromise;

      // Pulisce la cache dopo un upload riuscito
      CloudinaryService.clearCache();

      return result;
    } catch (error) {
      console.error("❌ Errore durante il caricamento:", error);
      throw new Error("Errore durante il caricamento della foto. Riprova.");
    }
  }

  /**
   * Cache per tutte le foto caricate (evita richieste multiple)
   */
  private static allPhotosCache: CloudinaryResponse[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 50 * 60 * 1000; // 5 minuti

  /**
   * Ottieni tutte le foto del matrimonio da Cloudinary
   * Recupera prima tutte le informazioni, poi implementa paginazione locale
   */
  static async getWeddingPhotos(
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    photos: CloudinaryResponse[];
    hasMore: boolean;
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    console.log(
      `🔄 Recuperando foto da Cloudinary (limite: ${limit}, offset: ${offset})...`
    );

    try {
      // Prima recupera tutte le foto se non sono in cache o la cache è scaduta
      const allPhotos = await CloudinaryService.getAllRealPhotos();

      if (allPhotos.length === 0) {
        console.log("⚠️ Nessuna foto trovata su Cloudinary");
        return {
          photos: [],
          hasMore: false,
          totalCount: 0,
          currentPage: 1,
          totalPages: 1,
        };
      }

      // Implementa paginazione locale
      const startIndex = offset;
      const endIndex = offset + limit;
      const paginatedPhotos = allPhotos.slice(startIndex, endIndex);
      const totalPages = Math.ceil(allPhotos.length / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      console.log(
        `✅ Caricate ${paginatedPhotos.length} foto (pagina ${currentPage}/${totalPages})`
      );

      return {
        photos: paginatedPhotos,
        hasMore: endIndex < allPhotos.length,
        totalCount: allPhotos.length,
        currentPage,
        totalPages,
      };
    } catch (error) {
      console.error("❌ Errore nel recupero delle foto:", error);
      return {
        photos: [],
        hasMore: false,
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
      };
    }
  }

  /**
   * Recupera tutte le foto reali caricate su Cloudinary
   * Usa cache per evitare richieste multiple
   */
  private static async getAllRealPhotos(): Promise<CloudinaryResponse[]> {
    const now = Date.now();

    // Verifica se la cache è valida
    if (
      CloudinaryService.allPhotosCache &&
      now - CloudinaryService.cacheTimestamp < CloudinaryService.CACHE_DURATION
    ) {
      console.log("📦 Usando cache per le foto");
      return CloudinaryService.allPhotosCache;
    }

    console.log("🔄 Recuperando tutte le foto da Cloudinary...");

    try {
      // Metodo 1: Prova con l'endpoint pubblico per tag
      const tagPhotos = await CloudinaryService.fetchPhotosByTag();
      if (tagPhotos.length > 0) {
        console.log(`✅ Trovate ${tagPhotos.length} foto con metodo tag`);
        CloudinaryService.updateCache(tagPhotos);
        return tagPhotos;
      }

      // Metodo 2: Prova a recuperare foto dalla cartella direttamente
      const folderPhotos = await CloudinaryService.fetchPhotosFromFolder();
      if (folderPhotos.length > 0) {
        console.log(`✅ Trovate ${folderPhotos.length} foto dalla cartella`);
        CloudinaryService.updateCache(folderPhotos);
        return folderPhotos;
      }

      // Metodo 3: Scansione delle foto caricate recentemente
      const recentPhotos = await CloudinaryService.fetchRecentPhotos();
      if (recentPhotos.length > 0) {
        console.log(`✅ Trovate ${recentPhotos.length} foto recenti`);
        CloudinaryService.updateCache(recentPhotos);
        return recentPhotos;
      }

      console.log("⚠️ Nessuna foto trovata con tutti i metodi");
      return [];
    } catch (error) {
      console.error("❌ Errore nel recupero di tutte le foto:", error);
      return [];
    }
  }

  /**
   * Aggiorna la cache delle foto
   */
  private static updateCache(photos: CloudinaryResponse[]): void {
    CloudinaryService.allPhotosCache = photos;
    CloudinaryService.cacheTimestamp = Date.now();
  }

  /**
   * Pulisce la cache (da chiamare dopo upload di nuove foto)
   */
  static clearCache(): void {
    CloudinaryService.allPhotosCache = null;
    CloudinaryService.cacheTimestamp = 0;
    console.log("🧹 Cache foto pulita");
  }

  /**
   * Recupera foto usando i tag pubblici (metodo principale)
   */
  private static async fetchPhotosByTag(): Promise<CloudinaryResponse[]> {
    try {
      const tagUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/list/wedding.json`;
      console.log("🔗 Recuperando foto con tag pubblico:", tagUrl);

      const response = await fetch(tagUrl, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const photos = data.resources || [];
        console.log(`📸 Trovate ${photos.length} foto con tag`);
        return photos;
      } else {
        console.log(`⚠️ Endpoint tag non disponibile (${response.status})`);
        return [];
      }
    } catch (error) {
      console.error("❌ Errore nel metodo tag:", error);
      return [];
    }
  }

  /**
   * Recupera foto dalla cartella specifica (metodo alternativo)
   */
  private static async fetchPhotosFromFolder(): Promise<CloudinaryResponse[]> {
    try {
      // Prova diversi tag che potrebbero essere stati usati
      const possibleTags = ["wedding", "matrimonio", "gallery"];

      for (const tag of possibleTags) {
        const tagUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/list/${tag}.json`;
        console.log(`🔗 Tentativo con tag: ${tag}`);

        try {
          const response = await fetch(tagUrl, {
            method: "GET",
            mode: "cors",
            headers: {
              Accept: "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            const photos = data.resources || [];
            if (photos.length > 0) {
              console.log(`📸 Trovate ${photos.length} foto con tag: ${tag}`);
              return photos;
            }
          }
        } catch (error) {
          console.log(
            `⚠️ Tag ${tag} non funziona:`,
            error instanceof Error ? error.message : "Errore sconosciuto"
          );
        }
      }

      return [];
    } catch (error) {
      console.error("❌ Errore nel metodo cartella:", error);
      return [];
    }
  }

  /**
   * Recupera foto recenti (metodo di backup)
   */
  private static async fetchRecentPhotos(): Promise<CloudinaryResponse[]> {
    try {
      console.log("🔗 Tentativo di recupero foto recenti...");

      // Questo metodo cerca di indovinare gli URL delle foto caricate
      // basandosi sui pattern comuni di Cloudinary
      const possiblePhotos: CloudinaryResponse[] = [];

      // Prova a cercare foto nella cartella wedding-photos
      const folderPrefix = CLOUDINARY_CONFIG.FOLDER;
      const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;

      // Genera alcuni possibili ID basati sui timestamp recenti
      const now = Date.now();
      const possibleIds = [];

      // Cerca foto degli ultimi giorni
      for (let days = 0; days < 7; days++) {
        const date = new Date(now - days * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
        possibleIds.push(`${folderPrefix}/${dateStr}`);
        possibleIds.push(`${folderPrefix}/photo_${dateStr}`);
        possibleIds.push(`${folderPrefix}/img_${dateStr}`);
      }

      // Testa ogni possibile ID
      for (const id of possibleIds) {
        for (const ext of ["jpg", "jpeg", "png", "webp"]) {
          const testUrl = `${baseUrl}/${id}.${ext}`;

          try {
            const response = await fetch(testUrl, {
              method: "HEAD",
              mode: "cors",
            });

            if (response.ok) {
              possiblePhotos.push({
                public_id: id,
                secure_url: testUrl,
                width: 800,
                height: 600,
                bytes: 150000,
                created_at: new Date().toISOString(),
              });

              // Limita il numero di foto trovate con questo metodo
              if (possiblePhotos.length >= 10) break;
            }
          } catch {
            // Continua con il prossimo
          }
        }
        if (possiblePhotos.length >= 10) break;
      }

      console.log(
        `📸 Trovate ${possiblePhotos.length} foto con metodo recenti`
      );
      return possiblePhotos;
    } catch (error) {
      console.error("❌ Errore nel metodo foto recenti:", error);
      return [];
    }
  }

  /**
   * Ottieni tutte le foto del matrimonio (metodo di compatibilità)
   */
  static async getAllWeddingPhotos(): Promise<CloudinaryResponse[]> {
    const result = await CloudinaryService.getWeddingPhotos(1000, 0); // Carica tutte le foto
    return result.photos;
  }

  /**
   * Testa la connessione a Cloudinary
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Prova a fare una richiesta semplice per testare la configurazione
      const testUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/list/test.json`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // Anche se non trova foto, se la richiesta ha successo vuol dire che il cloud name è corretto
      if (response.ok || response.status === 404) {
        return { success: true };
      } else {
        return { success: false, error: `Errore HTTP: ${response.status}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore di connessione'
      };
    }
  }

  /**
   * Genera URL ottimizzato per la visualizzazione
   */
  static getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: "auto" | number;
      format?: "auto" | "webp" | "jpg" | "png";
    } = {}
  ): string {
    const {
      width = 800,
      height = 600,
      quality = "auto",
      format = "auto",
    } = options;

    return (
      `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload/` +
      `w_${width},h_${height},c_fill,q_${quality},f_${format}/${publicId}`
    );
  }
}
