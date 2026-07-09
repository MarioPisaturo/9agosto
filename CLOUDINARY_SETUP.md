# 🌤️ Configurazione Cloudinary per l'App Matrimoniale

## Panoramica

L'app ora utilizza **Cloudinary** per il caricamento e la gestione delle foto condivise. Questo significa:

✅ **Le foto sono condivise tra tutti gli ospiti**  
✅ **Compressione automatica delle immagini**  
✅ **Limite di 5MB per foto**  
✅ **Caricamento ottimizzato e veloce**  
✅ **CDN globale per visualizzazione rapida**

## 🚀 Setup Rapido

### 1. Crea Account Cloudinary (Gratuito)

1. Vai su [cloudinary.com](https://cloudinary.com)
2. Clicca "Sign Up for Free"
3. Completa la registrazione

### 2. Ottieni le Credenziali

1. Accedi al Dashboard Cloudinary
2. Nella sezione "Product Environment Credentials" troverai:
   - **Cloud name** (es. `dxxxxx123`)
   - **API Key**
   - **API Secret**

### 3. Configura l'Upload Preset

1. Nel Dashboard, vai su **Settings** → **Upload**
2. Scorri fino a **Upload presets**
3. Clicca **"Add upload preset"**
4. Configura così:

```
Preset name: wedding-photos
Signing Mode: Unsigned ⚠️ IMPORTANTE
Folder: wedding-photos
Tags: wedding,matrimonio,gallery
Allowed formats: jpg,png,webp
Max file size: 5MB
Auto optimize: ✅ Enabled
Auto format: ✅ Enabled
```

5. Clicca **Save**

### 4. Aggiorna la Configurazione

Apri il file `src/config/cloudinary.ts` e sostituisci:

```typescript
export const CLOUDINARY_CONFIG = {
  // 👇 Sostituisci con il tuo Cloud Name
  CLOUD_NAME: "il-tuo-cloud-name",

  // 👇 Deve corrispondere al nome dell'upload preset creato
  UPLOAD_PRESET: "wedding-photos",

  // ... resto della configurazione
};
```

## 🎯 Test della Configurazione

1. Avvia l'app: `npm run dev`
2. Vai alla sezione "Carica"
3. Prova a caricare una foto
4. Se tutto funziona, vedrai:
   - Barra di progresso durante il caricamento
   - Messaggio di successo
   - La foto apparirà nella galleria

## 📊 Piano Gratuito Cloudinary

Il piano gratuito include:

- **25GB** di storage
- **25GB** di bandwidth mensile
- **Trasformazioni** illimitate
- **CDN** globale

Perfetto per un matrimonio! 🎉

## 🔧 Funzionalità Implementate

### Caricamento Intelligente

- **Compressione automatica** se la foto supera 2MB
- **Validazione formato** (JPG, PNG, WebP)
- **Limite dimensione** di 5MB
- **Barra di progresso** in tempo reale

### Visualizzazione Ottimizzata

- **Miniature** ottimizzate per la galleria (400x300px)
- **Immagini full-size** al click
- **Formato automatico** (WebP quando supportato)
- **Qualità adattiva** in base alla connessione

### Metadati

- **Nome dell'ospite** che ha caricato la foto
- **Timestamp** di caricamento
- **Dimensioni** originali
- **Peso** del file

## 🐛 Risoluzione Problemi

### Errore: "Upload preset not found"

- Verifica di aver creato l'upload preset "wedding-photos"
- Assicurati che sia impostato su "Unsigned"

### Errore: "Invalid cloud name"

- Controlla che il CLOUD_NAME sia corretto
- Non includere spazi o caratteri speciali

### Le foto non si caricano

- Verifica la connessione internet
- Controlla che la foto sia sotto i 5MB
- Assicurati che sia in formato JPG, PNG o WebP

### Le foto non appaiono nella galleria

- Le foto vengono caricate con il tag "wedding"
- Potrebbe servire del tempo per la sincronizzazione
- Prova a ricaricare la pagina

## 📞 Supporto

Se hai problemi:

1. Controlla la console del browser (F12) per errori
2. Verifica che tutti i passaggi di configurazione siano corretti
3. Il piano gratuito di Cloudinary ha limiti generosi ma non illimitati

## 🎉 Pronto!

Una volta configurato, l'app sarà pronta per il matrimonio! Tutti gli ospiti potranno:

- Caricare foto in tempo reale
- Vedere le foto di tutti gli altri
- Godere di caricamenti veloci e ottimizzati

Buon matrimonio! 💒✨
