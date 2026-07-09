// Configurazione Cloudinary
// IMPORTANTE: Sostituisci questi valori con le tue credenziali Cloudinary

export const CLOUDINARY_CONFIG = {
  // Il tuo Cloud Name di Cloudinary (trovalo nel Dashboard)
  CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "duddacwym",

  // API Key e Secret per l'Admin API (trovale nel Dashboard > Settings > Access Keys)
  // IMPORTANTE: In produzione, usa variabili d'ambiente per sicurezza!
  API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY || "", // Sostituisci con la tua API Key
  API_SECRET: import.meta.env.VITE_CLOUDINARY_API_SECRET || "", // Sostituisci con il tuo API Secret

  // Nome dell'upload preset (da creare nel Dashboard Cloudinary)
  UPLOAD_PRESET:
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "wedding-photos",

  // Cartella dove salvare le foto
  FOLDER: import.meta.env.VITE_CLOUDINARY_FOLDER || "wedding-photos",

  // Tag per organizzare le foto
  TAGS: ["wedding", "matrimonio", "gallery"],

  // Limiti di caricamento
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,

  // Formati supportati
  SUPPORTED_FORMATS: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

/*
ISTRUZIONI PER LA CONFIGURAZIONE:

1. Vai su https://cloudinary.com e crea un account gratuito
2. Nel Dashboard, trova il tuo "Cloud name" e sostituiscilo sopra
3. Vai su Settings > Access Keys e copia:
   - API Key (sostituiscila nel file .env)
   - API Secret (sostituiscila nel file .env)

4. IMPORTANTE - Abilita accesso pubblico per evitare errori CORS:
   - Vai su Settings > Security
   - Nella sezione "Restricted media types" assicurati che "image" NON sia selezionato
   - Abilita "Allow public access to images" se disponibile

5. Vai su Settings > Upload > Upload presets
6. Clicca "Add upload preset"
7. Configura l'upload preset:
   - Preset name: wedding-photos
   - Signing Mode: Unsigned
   - Folder: wedding-photos
   - Tags: wedding,matrimonio,gallery (IMPORTANTE per il recupero!)
   - Allowed formats: jpg,png,webp
   - Max file size: 5MB
   - Auto optimize: enabled
   - Auto format: enabled
8. Salva l'upload preset

9. CONFIGURAZIONE CORS (se necessario):
   - Vai su Settings > Security
   - Aggiungi il tuo dominio (es: localhost:5173) in "Allowed fetch domains"

IMPORTANTE SICUREZZA:
- Non condividere mai le tue API Key e Secret
- In produzione, usa variabili d'ambiente invece di valori hardcoded
- Le credenziali permettono di gestire tutte le risorse del tuo account

Il piano gratuito di Cloudinary include:
- 25GB di storage
- 25GB di bandwidth mensile
- Trasformazioni di immagini automatiche
- CDN globale per caricamento veloce

Perfetto per un'app matrimoniale!
*/
