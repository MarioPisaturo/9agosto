import { useEffect } from "react";
import { DropboxService } from "../services/dropboxService";

/**
 * Hook per gestire automaticamente la cache delle immagini
 * - Pulisce la cache scaduta ogni 5 minuti
 * - Pulisce tutto quando il componente viene smontato
 * - Monitora l'utilizzo della memoria
 */
export const useCacheManager = () => {
  useEffect(() => {
    // Pulisci la cache scaduta immediatamente all'avvio
    DropboxService.clearExpiredBlobCache();

    // Imposta un timer per pulire la cache ogni 5 minuti
    const cleanupInterval = setInterval(() => {
      DropboxService.clearExpiredBlobCache();

      // Log delle statistiche della cache per il debug
      const stats = DropboxService.getCacheStats();
      console.log(
        `📊 Cache stats: ${stats.blobCacheSize} blob URLs, ${stats.photoCacheSize} foto`
      );
    }, 5 * 60 * 1000); // 5 minuti

    // Cleanup quando l'app viene chiusa o il componente smontato
    const handleBeforeUnload = () => {
      DropboxService.clearAllBlobCache();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Non pulire la cache qui perché potremmo navigare tra pagine
      // La cache dovrebbe persistere durante la navigazione
    };
  }, []);

  // Funzioni utili esposte dall'hook
  const clearCache = () => {
    DropboxService.clearAllBlobCache();
  };

  const getCacheStats = () => {
    return DropboxService.getCacheStats();
  };

  return {
    clearCache,
    getCacheStats,
  };
};
