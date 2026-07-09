# 🔧 Risoluzione Errori 401 e CORS Cloudinary

## Problemi

1. **401 Unauthorized**: Quando tenti di recuperare le foto esistenti da Cloudinary
2. **Errori CORS**: Le richieste dal browser vengono bloccate per motivi di sicurezza

## Cause

- **401**: L'endpoint Admin API richiede autenticazione con API Key e Secret
- **CORS**: Le API Admin di Cloudinary non sono progettate per essere chiamate direttamente dal browser

## Soluzione Implementata

### 1. ✅ Aggiornata la Configurazione

- Aggiunte le credenziali API (API_KEY e API_SECRET) in `src/config/cloudinary.ts`
- Aggiornate le istruzioni per ottenere le credenziali dal Dashboard Cloudinary

### 2. ✅ Aggiornato il Servizio (CORS-Safe + Paginazione Reale)

- **Recupero Completo**: Prima recupera TUTTE le foto reali caricate su Cloudinary
- **Cache Intelligente**: Evita richieste multiple con cache di 5 minuti
- **Paginazione Locale**: Implementa vera paginazione sui dati reali
- **Metodi Multipli**: 3 strategie diverse per trovare le foto reali:
  - Tag pubblici (`wedding`, `matrimonio`, `gallery`)
  - Scansione della cartella configurata
  - Ricerca per pattern temporali recenti
- **Zero Foto Finte**: Rimosse tutte le foto di esempio/sample

## 🚀 Passi per Completare la Configurazione

### Passo 1: Ottieni le Credenziali API

1. Vai su [Cloudinary Dashboard](https://cloudinary.com/console)
2. Accedi al tuo account
3. Vai su **Settings** > **Access Keys**
4. Copia:
   - **API Key**
   - **API Secret**

### Passo 2: Crea il File di Configurazione

Crea un file `.env` nella root del progetto con questo contenuto:

```env
# Configurazione Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=duddacwym
VITE_CLOUDINARY_API_KEY=your_api_key_here
VITE_CLOUDINARY_API_SECRET=your_api_secret_here
VITE_CLOUDINARY_UPLOAD_PRESET=wedding-photos
VITE_CLOUDINARY_FOLDER=wedding-photos
```

**Sostituisci `your_api_key_here` e `your_api_secret_here` con i tuoi valori reali!**

### Passo 3: Configura l'Upload Preset (se non fatto)

1. Nel Dashboard Cloudinary, vai su **Settings** > **Upload** > **Upload presets**
2. Clicca **"Add upload preset"**
3. Configura:
   - **Preset name**: `wedding-photos`
   - **Signing Mode**: `Unsigned`
   - **Folder**: `wedding-photos`
   - **Tags**: `wedding,matrimonio,gallery`
   - **Allowed formats**: `jpg,png,webp`
   - **Max file size**: `5MB`
4. Salva l'upload preset

## 🔒 Sicurezza

### ⚠️ IMPORTANTE

- **NON condividere mai** le tue API Key e Secret
- **NON committare** le credenziali su Git
- In produzione, usa **variabili d'ambiente**

### Per Produzione

Crea un file `.env` nella root del progetto:

```env
VITE_CLOUDINARY_CLOUD_NAME=duddacwym
VITE_CLOUDINARY_API_KEY=your_api_key_here
VITE_CLOUDINARY_API_SECRET=your_api_secret_here
VITE_CLOUDINARY_UPLOAD_PRESET=wedding-photos
```

E aggiorna la configurazione per usare le variabili d'ambiente:

```typescript
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "duddacwym",
  API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY || "YOUR_API_KEY_HERE",
  API_SECRET:
    import.meta.env.VITE_CLOUDINARY_API_SECRET || "YOUR_API_SECRET_HERE",
  UPLOAD_PRESET:
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "wedding-photos",
  // ... resto della configurazione
};
```

## 🧪 Test

Dopo aver aggiornato le credenziali:

1. Avvia l'app: `npm run dev`
2. Vai alla pagina Gallery
3. Le foto esistenti dovrebbero caricarsi senza errori 401
4. Controlla la console del browser per i log di debug

## 🔄 Metodi Fallback

Il servizio include metodi fallback che tentano approcci alternativi se l'autenticazione principale fallisce:

1. **Metodo principale**: Admin API con autenticazione completa
2. **Metodo fallback**: Endpoint pubblico per tag (limitato)

## 📞 Supporto

Se continui ad avere problemi:

1. Verifica che le credenziali siano corrette
2. Controlla che l'upload preset sia configurato correttamente
3. Verifica i log della console del browser
4. Controlla i limiti del tuo piano Cloudinary

Il piano gratuito include:

- 25GB di storage
- 25GB di bandwidth mensile
- API calls illimitate per le operazioni base

## 📊 Nuova API di Paginazione

### Metodo Aggiornato

```typescript
// Prima (vecchio)
getWeddingPhotos(limit: number = 5): Promise<{
  photos: CloudinaryResponse[];
  hasMore: boolean;
  totalCount: number;
}>

// Ora (nuovo)
getWeddingPhotos(limit: number = 5, offset: number = 0): Promise<{
  photos: CloudinaryResponse[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}>
```

### Come Funziona

1. **Prima chiamata**: Recupera TUTTE le foto reali da Cloudinary
2. **Cache**: Salva i risultati per 5 minuti
3. **Paginazione**: Taglia i risultati localmente
4. **Aggiornamento**: Cache si pulisce automaticamente dopo nuovi upload

### Esempio di Uso

```typescript
// Prima pagina (foto 0-4)
const page1 = await CloudinaryService.getWeddingPhotos(5, 0);

// Seconda pagina (foto 5-9)
const page2 = await CloudinaryService.getWeddingPhotos(5, 5);

// Info paginazione
console.log(`Pagina ${page1.currentPage} di ${page1.totalPages}`);
console.log(`Totale foto: ${page1.totalCount}`);
```
