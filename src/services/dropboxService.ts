import { DROPBOX_CONFIG } from "../config/dropbox";
import { DROPBOX_PROXY, USE_DROPBOX_PROXY } from "../config/runtime";
import { DropboxTokenManager } from "../utils/dropboxTokenManager";
import { compressBlobForDisplay } from "../utils/imageCompression";

interface DropboxFileEntry {
  ".tag": string;
  name: string;
  path_lower: string;
  path_display: string;
  size: number;
  server_modified: string;
  content_hash: string;
}

export interface DropboxResponse {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size: number;
  server_modified: string;
  content_hash: string;
  sharing_info?: {
    read_only: boolean;
    parent_shared_folder_id?: string;
    modified_by?: string;
  };
  // Campi standardizzati per l'interfaccia Photo
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  // Metadati personalizzati
  metadata?: {
    description?: string;
    uploadedBy?: string;
    uploadedAt?: string;
  };
}

export class DropboxService {
  private static readonly API_BASE_URL = "https://api.dropboxapi.com/2";
  private static readonly CONTENT_API_URL = "https://content.dropboxapi.com/2";

  // Cache per le foto (stesso sistema di prima)
  private static allPhotosCache: DropboxResponse[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 50 * 60 * 1000; // 50 minuti

  // Cache per le blob URL delle immagini
  private static blobCache = new Map<
    string,
    { url: string; timestamp: number }
  >();
  private static readonly BLOB_CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Verifica lo stato del token prima delle operazioni
   */
  static async checkTokenHealth(): Promise<void> {
    const status = await DropboxTokenManager.checkTokenStatus();
    if (!status.isValid) {
      console.warn("⚠️ Token Dropbox:", status.error);
    }
  }

  /**
   * Crea la cartella di destinazione se non esiste ancora
   */
  private static async ensureFolderExists(): Promise<void> {
    const folder = DROPBOX_CONFIG.FOLDER;
    if (!folder || folder === "/") return;

    const response = await fetch(
      `${DropboxService.API_BASE_URL}/files/create_folder_v2`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: folder,
          autorename: false,
        }),
      }
    );

    if (response.ok) {
      console.log(`📁 Cartella creata: ${folder}`);
      return;
    }

    const errorText = await response.text();
    if (
      response.status === 409 &&
      (errorText.includes("path/conflict/folder") ||
        errorText.includes("path/conflict"))
    ) {
      return;
    }

    console.warn(`⚠️ Impossibile creare cartella ${folder}:`, errorText);
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
    if (file.size > DROPBOX_CONFIG.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Il file è troppo grande. Dimensione massima: ${DROPBOX_CONFIG.MAX_FILE_SIZE_MB}MB`,
      };
    }

    // Controlla i formati supportati
    if (!DROPBOX_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
      return {
        isValid: false,
        error: "Formato non supportato. Usa JPG, PNG, WebP o GIF",
      };
    }

    return { isValid: true };
  }

  /**
   * Carica un'immagine su Dropbox
   */
  static async uploadImage(
    file: File,
    _uploadedBy?: string,
    onProgress?: (progress: number) => void,
    description?: string
  ): Promise<DropboxResponse> {
    // Valida il file
    const validation = DropboxService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    if (!USE_DROPBOX_PROXY && !DROPBOX_CONFIG.ACCESS_TOKEN) {
      throw new Error(
        "Access token Dropbox mancante. Configura le credenziali."
      );
    }

    try {
      await DropboxService.checkTokenHealth();

      if (USE_DROPBOX_PROXY) {
        onProgress?.(20);
        const fileBase64 = await DropboxService.fileToBase64(file);
        onProgress?.(60);

        const response = await fetch(DROPBOX_PROXY.upload, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileBase64,
            description,
            uploadedBy: _uploadedBy,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Errore upload: ${errorText}`);
        }

        const uploadedFile = await response.json();
        onProgress?.(100);
        DropboxService.clearCache();

        return {
          ...uploadedFile,
          id: uploadedFile.path_lower,
          public_id: uploadedFile.path_lower,
          secure_url: uploadedFile.path_lower,
          width: 800,
          height: 600,
          bytes: uploadedFile.size,
          created_at: uploadedFile.server_modified,
        };
      }

      await DropboxService.ensureFolderExists();

      console.log("📤 Caricando foto su Dropbox...");

      // Genera un nome file unico
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${DROPBOX_CONFIG.FOLDER}/${fileName}`;

      // Crea una Promise con supporto per il progresso
      const uploadPromise = new Promise<DropboxResponse>((resolve, reject) => {
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
        xhr.onload = async () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log("✅ Foto caricata su Dropbox:", response.name);

              // Converti in formato compatibile - usa il path direttamente
              const dropboxResponse: DropboxResponse = {
                ...response,
                public_id: response.path_lower,
                secure_url: response.path_lower, // Usa il path, sarà gestito da DropboxImage
                width: 800, // Dropbox non fornisce dimensioni, usiamo valori standard
                height: 600,
                bytes: response.size,
                created_at: response.server_modified,
              };

              // Salva i metadati se forniti
              if (description || _uploadedBy) {
                try {
                  await DropboxService.saveMetadata(response.path_lower, {
                    description,
                    uploadedBy: _uploadedBy,
                    uploadedAt: new Date().toISOString(),
                  });
                } catch (metadataError) {
                  console.warn(
                    "Errore nel salvataggio dei metadati:",
                    metadataError
                  );
                  // Non blocchiamo il caricamento per errori di metadati
                }
              }

              // Pulisce la cache dopo upload riuscito
              DropboxService.clearCache();

              resolve(dropboxResponse);
            } catch (parseError) {
              console.error("Errore nel parsing della risposta:", parseError);
              reject(new Error("Errore nel parsing della risposta"));
            }
          } else {
            const errorText = xhr.responseText;
            console.error(`Errore HTTP ${xhr.status}:`, errorText);
            reject(new Error(`Errore HTTP: ${xhr.status}`));
          }
        };

        xhr.onerror = () =>
          reject(new Error("Errore di rete durante il caricamento"));
        xhr.ontimeout = () =>
          reject(new Error("Timeout durante il caricamento"));

        // Configura la richiesta
        xhr.open("POST", `${DropboxService.CONTENT_API_URL}/files/upload`);
        xhr.timeout = 60000; // 60 secondi per file più grandi

        // Headers per Dropbox API
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`
        );
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.setRequestHeader(
          "Dropbox-API-Arg",
          JSON.stringify({
            path: filePath,
            mode: "add",
            autorename: true,
            mute: false,
            strict_conflict: false,
          })
        );

        xhr.send(file);
      });

      return await uploadPromise;
    } catch (error) {
      console.error("❌ Errore durante il caricamento su Dropbox:", error);
      throw new Error("Errore durante il caricamento della foto. Riprova.");
    }
  }

  /**
   * Crea un link di condivisione pubblico per un file (metodo legacy - non più utilizzato)
   */
  // @ts-expect-error - Metodo legacy mantenuto per compatibilità
  private static async createShareLink(filePath: string): Promise<string> {
    try {
      const response = await fetch(
        `${DropboxService.API_BASE_URL}/sharing/create_shared_link_with_settings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
            settings: {
              requested_visibility: "public",
              audience: "public",
              access: "viewer",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Converti il link Dropbox in link diretto per immagini
        return data.url.replace("?dl=0", "?raw=1");
      } else {
        // Se il link esiste già, prova a recuperarlo
        return await DropboxService.getExistingShareLink(filePath);
      }
    } catch (error) {
      console.error("Errore nella creazione del link:", error);
      // Fallback: genera URL temporaneo
      return `${
        DropboxService.CONTENT_API_URL
      }/files/download?arg=${encodeURIComponent(
        JSON.stringify({ path: filePath })
      )}`;
    }
  }

  /**
   * Restituisce l'URL blob dalla cache se ancora valido (sincrono, senza rete).
   */
  static getCachedImageBlobUrl(
    filePath: string,
    options: { variant?: "full" | "display" | "thumb" } = {}
  ): string | null {
    const variant = options.variant ?? "display";
    const cacheKey = variant === "full" ? filePath : `${filePath}:${variant}`;
    const cached = this.blobCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.BLOB_CACHE_DURATION) {
      return cached.url;
    }

    return null;
  }

  /**
   * Scarica un'immagine da Dropbox e restituisce un blob URL (con cache)
   */
  static async getImageBlob(
    filePath: string,
    options: { variant?: "full" | "display" | "thumb" } = {}
  ): Promise<string> {
    const variant = options.variant ?? "display";
    const cacheKey = variant === "full" ? filePath : `${filePath}:${variant}`;

    try {
      // Controlla se abbiamo già questa immagine in cache
      const cachedUrl = this.getCachedImageBlobUrl(filePath, { variant });
      if (cachedUrl) {
        console.log(`📦 Cache hit per: ${cacheKey}`);
        return cachedUrl;
      }

      const cached = this.blobCache.get(cacheKey);
      const now = Date.now();

      // Se la cache è scaduta, rimuovi l'entry e revoca il blob URL
      if (cached) {
        console.log(`🗑️ Cache scaduta per: ${cacheKey}, rimuovo...`);
        URL.revokeObjectURL(cached.url);
        this.blobCache.delete(cacheKey);
      }

      console.log(`⬇️ Scaricando nuova immagine: ${filePath} (${variant})`);

      let blob: Blob | null = null;

      if (USE_DROPBOX_PROXY) {
        const response = await fetch(
          `${DROPBOX_PROXY.image}?path=${encodeURIComponent(filePath)}`
        );

        if (!response.ok) {
          return "";
        }

        blob = await response.blob();
      } else {
        const response = await fetch(
          `${DropboxService.CONTENT_API_URL}/files/download`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
              "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
            },
          }
        );

        if (!response.ok) {
          console.error(`Errore nel download dell'immagine: ${response.status}`);
          return "";
        }

        blob = await response.blob();
      }

      if (!blob) {
        return "";
      }

      const optimizedBlob =
        variant === "full"
          ? blob
          : await compressBlobForDisplay(
              blob,
              variant === "thumb" ? "thumb" : "display"
            );

      const blobUrl = URL.createObjectURL(optimizedBlob);
      this.blobCache.set(cacheKey, { url: blobUrl, timestamp: now });

      console.log(`💾 Immagine salvata in cache: ${cacheKey}`);

      return blobUrl;
    } catch (error) {
      console.error("Errore nel download dell'immagine:", error);
      return "";
    }
  }

  /**
   * Pulisce la cache delle blob URL scadute
   */
  static clearExpiredBlobCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [filePath, cached] of this.blobCache.entries()) {
      if (now - cached.timestamp >= this.BLOB_CACHE_DURATION) {
        URL.revokeObjectURL(cached.url);
        this.blobCache.delete(filePath);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Pulite ${cleanedCount} blob URL scadute dalla cache`);
    }
  }

  /**
   * Pulisce completamente la cache delle blob URL
   */
  static clearAllBlobCache(): void {
    for (const [, cached] of this.blobCache.entries()) {
      URL.revokeObjectURL(cached.url);
    }
    this.blobCache.clear();
    console.log(`🗑️ Cache blob URL completamente pulita`);
  }

  /**
   * Restituisce statistiche della cache
   */
  static getCacheStats(): {
    blobCacheSize: number;
    photoCacheSize: number;
    blobCacheItems: string[];
  } {
    return {
      blobCacheSize: this.blobCache.size,
      photoCacheSize: this.allPhotosCache?.length || 0,
      blobCacheItems: Array.from(this.blobCache.keys()),
    };
  }

  /**
   * Recupera un link di condivisione esistente
   */
  private static async getExistingShareLink(filePath: string): Promise<string> {
    try {
      const response = await fetch(
        `${DropboxService.API_BASE_URL}/sharing/list_shared_links`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
            direct_only: true,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.links && data.links.length > 0) {
          return data.links[0].url.replace("?dl=0", "?raw=1");
        }
      }

      // Fallback
      return `${
        DropboxService.CONTENT_API_URL
      }/files/download?arg=${encodeURIComponent(
        JSON.stringify({ path: filePath })
      )}`;
    } catch (error) {
      console.error("Errore nel recupero del link esistente:", error);
      return `${
        DropboxService.CONTENT_API_URL
      }/files/download?arg=${encodeURIComponent(
        JSON.stringify({ path: filePath })
      )}`;
    }
  }

  /**
   * Ottieni le foto del matrimonio da Dropbox con paginazione
   */
  static async getWeddingPhotos(
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    photos: DropboxResponse[];
    hasMore: boolean;
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    console.log(
      `🔄 Recuperando foto da Dropbox (limite: ${limit}, offset: ${offset})...`
    );

    try {
      // Prima recupera tutte le foto se non sono in cache o la cache è scaduta
      const allPhotos = await DropboxService.getAllRealPhotos();

      if (allPhotos.length === 0) {
        console.log("⚠️ Nessuna foto trovata su Dropbox");
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
        `✅ Caricate ${paginatedPhotos.length} foto da Dropbox (pagina ${currentPage}/${totalPages})`
      );

      return {
        photos: paginatedPhotos,
        hasMore: endIndex < allPhotos.length,
        totalCount: allPhotos.length,
        currentPage,
        totalPages,
      };
    } catch (error) {
      console.error("❌ Errore nel recupero delle foto da Dropbox:", error);
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
   * Recupera tutte le foto reali dalla cartella Dropbox
   */
  private static async getAllRealPhotos(): Promise<DropboxResponse[]> {
    const now = Date.now();

    // Verifica se la cache è valida
    if (
      DropboxService.allPhotosCache &&
      now - DropboxService.cacheTimestamp < DropboxService.CACHE_DURATION
    ) {
      console.log("📦 Usando cache per le foto Dropbox");
      return DropboxService.allPhotosCache;
    }

    console.log("🔄 Recuperando tutte le foto da Dropbox...");

    if (!USE_DROPBOX_PROXY && !DROPBOX_CONFIG.ACCESS_TOKEN) {
      console.error("❌ Access token Dropbox mancante");
      return [];
    }

    await DropboxService.checkTokenHealth();

    try {
      if (USE_DROPBOX_PROXY) {
        const response = await fetch(DROPBOX_PROXY.list);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Errore HTTP ${response.status}:`, errorText);
          return [];
        }

        const data = await response.json();
        const imageFiles = data.entries || [];
        const photos = await DropboxService.mapEntriesToPhotos(imageFiles);
        DropboxService.updateCache(photos);
        return photos;
      }

      const response = await fetch(
        `${DropboxService.API_BASE_URL}/files/list_folder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: DROPBOX_CONFIG.FOLDER,
            recursive: false,
            include_media_info: true,
            include_deleted: false,
            include_has_explicit_shared_members: false,
            include_mounted_folders: true,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const files = data.entries || [];

        // Filtra solo i file immagine
        const imageFiles = files.filter(
          (file: DropboxFileEntry) =>
            file[".tag"] === "file" &&
            DROPBOX_CONFIG.SUPPORTED_FORMATS.some((format) =>
              file.name.toLowerCase().endsWith(format.replace("image/", "."))
            )
        );

        const photos = await DropboxService.mapEntriesToPhotos(imageFiles);

        console.log(`✅ Trovate ${photos.length} foto su Dropbox`);
        DropboxService.updateCache(photos);
        return photos;
      } else {
        const errorText = await response.text();
        console.error(`Errore HTTP ${response.status}:`, errorText);

        // Cartella non ancora creata: normale al primo avvio
        if (
          response.status === 409 &&
          errorText.includes("path/not_found")
        ) {
          console.log(
            `📁 Cartella ${DROPBOX_CONFIG.FOLDER} non trovata: verrà creata al primo upload`
          );
          return [];
        }

        // Messaggio di errore specifico per 401
        if (response.status === 401) {
          console.error(`
🚨 ERRORE 401 DROPBOX - PERMESSI MANCANTI!

Il tuo Access Token non ha i permessi necessari.

SOLUZIONE RAPIDA:
1. Vai su https://www.dropbox.com/developers/apps
2. Clicca sulla tua app
3. Tab "Permissions" → Abilita tutti i permessi (soprattutto files.metadata.read)
4. Tab "Settings" → Rigenera l'Access Token
5. Aggiorna il token nel file .env
6. Riavvia l'app

Leggi DROPBOX_401_FIX.md per i dettagli completi.
          `);
        }

        return [];
      }
    } catch (error) {
      console.error("❌ Errore nel recupero delle foto da Dropbox:", error);
      return [];
    }
  }

  /**
   * Converte le entry Dropbox nel formato usato dall'app
   */
  private static async mapEntriesToPhotos(
    imageFiles: DropboxFileEntry[]
  ): Promise<DropboxResponse[]> {
    const photos = await Promise.all(
      imageFiles.map(async (file) => {
        const metadata = await DropboxService.loadMetadata(file.path_lower);

        return {
          id: file.path_lower,
          ...file,
          public_id: file.path_lower,
          secure_url: file.path_lower,
          width: 800,
          height: 600,
          bytes: file.size,
          created_at: file.server_modified,
          metadata: metadata || undefined,
        };
      })
    );

    photos.sort(
      (a, b) =>
        new Date(b.server_modified).getTime() -
        new Date(a.server_modified).getTime()
    );

    return photos;
  }

  /**
   * Aggiorna la cache delle foto
   */
  private static updateCache(photos: DropboxResponse[]): void {
    DropboxService.allPhotosCache = photos;
    DropboxService.cacheTimestamp = Date.now();
  }

  /**
   * Pulisce la cache (da chiamare dopo upload di nuove foto)
   */
  static clearCache(): void {
    DropboxService.allPhotosCache = null;
    DropboxService.cacheTimestamp = 0;
    console.log("🧹 Cache foto Dropbox pulita");
  }

  /**
   * Ottieni tutte le foto (metodo di compatibilità)
   */
  static async getAllWeddingPhotos(): Promise<DropboxResponse[]> {
    const result = await DropboxService.getWeddingPhotos(1000, 0);
    return result.photos;
  }

  /**
   * Salva i metadati di una foto su Dropbox
   */
  static async saveMetadata(
    filePath: string,
    metadata: {
      description?: string;
      uploadedBy?: string;
      uploadedAt?: string;
    }
  ): Promise<void> {
    if (!DROPBOX_CONFIG.ACCESS_TOKEN) {
      throw new Error("Access token Dropbox mancante");
    }

    try {
      // Crea un file di metadati JSON separato
      const metadataPath = `${filePath}.metadata.json`;
      const metadataContent = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataContent], {
        type: "application/json",
      });

      const response = await fetch(
        `${DropboxService.CONTENT_API_URL}/files/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              path: metadataPath,
              mode: "overwrite",
              autorename: false,
              mute: true,
            }),
          },
          body: metadataBlob,
        }
      );

      if (response.ok) {
        console.log("✅ Metadati salvati per:", filePath);
      } else {
        const errorText = await response.text();
        console.warn("Errore nel salvataggio metadati:", errorText);
      }
    } catch (error) {
      console.warn("Errore nel salvataggio metadati:", error);
      throw error;
    }
  }

  /**
   * Carica i metadati di una foto da Dropbox
   */
  static async loadMetadata(filePath: string): Promise<{
    description?: string;
    uploadedBy?: string;
    uploadedAt?: string;
  } | null> {
    if (!USE_DROPBOX_PROXY && !DROPBOX_CONFIG.ACCESS_TOKEN) {
      return null;
    }

    try {
      const metadataPath = `${filePath}.metadata.json`;

      if (USE_DROPBOX_PROXY) {
        const response = await fetch(
          `${DROPBOX_PROXY.image}?path=${encodeURIComponent(metadataPath)}`
        );

        if (!response.ok) {
          return null;
        }

        return JSON.parse(await response.text());
      }

      const response = await fetch(
        `${DropboxService.CONTENT_API_URL}/files/download`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Dropbox-API-Arg": JSON.stringify({
              path: metadataPath,
            }),
          },
        }
      );

      if (response.ok) {
        const metadataText = await response.text();
        return JSON.parse(metadataText);
      } else {
        // File metadati non esiste, ritorna null
        return null;
      }
    } catch (error) {
      console.warn("Errore nel caricamento metadati per", filePath, ":", error);
      return null;
    }
  }

  /**
   * Elimina una foto da Dropbox
   */
  static async deletePhoto(filePath: string): Promise<boolean> {
    if (!DROPBOX_CONFIG.ACCESS_TOKEN) {
      throw new Error("Access token Dropbox mancante");
    }

    try {
      const response = await fetch(
        `${DropboxService.API_BASE_URL}/files/delete_v2`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Foto eliminata da Dropbox:", filePath);
        DropboxService.clearCache(); // Pulisce la cache
        return true;
      } else {
        const errorText = await response.text();
        console.error(
          `Errore nell'eliminazione ${response.status}:`,
          errorText
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Errore nell'eliminazione della foto:", error);
      return false;
    }
  }

  /**
   * Genera URL ottimizzato per la visualizzazione (compatibilità)
   */
  static getOptimizedUrl(publicId: string): string {
    // Restituisce l'URL originale
    return publicId;
  }
}
