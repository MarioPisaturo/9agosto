# 🗂️ Guida Completa: Setup Dropbox

## 🎯 Perché Dropbox?

- ✅ **Zero problemi CORS**: API progettate per il browser
- ✅ **Autenticazione semplice**: Solo un Access Token
- ✅ **API affidabili**: Documentazione chiara e funzionante
- ✅ **Storage generoso**: 2GB gratuiti (più che sufficienti per matrimoni)
- ✅ **Condivisione facile**: Link pubblici automatici
- ✅ **Backup sicuro**: Le foto sono al sicuro nel cloud

## 📋 Passo 1: Creare l'App Dropbox

### 1.1 Vai su Dropbox Developers

1. Apri https://www.dropbox.com/developers/apps
2. Accedi con il tuo account Dropbox (creane uno se non ce l'hai)

### 1.2 Crea una Nuova App

1. Clicca **"Create app"**
2. Scegli le opzioni:
   - **Choose an API**: `Dropbox API`
   - **Choose the type of access**: `Full Dropbox` (accesso completo) o `App folder` (più sicuro)
   - **Name your app**: `wedding-app-[tuo-nome]` (deve essere unico)
3. Clicca **"Create app"**

### 1.3 Configura l'App

Nella pagina dell'app appena creata:

#### Permissions (Permessi) - ⚠️ IMPORTANTE!

Vai nella tab **"Permissions"** e abilita TUTTI questi permessi:

- ✅ `files.content.write` - Per caricare foto
- ✅ `files.content.read` - Per leggere foto
- ✅ `files.metadata.write` - Per scrivere metadati dei file
- ✅ `files.metadata.read` - Per ottenere info sui file (OBBLIGATORIO!)
- ✅ `sharing.write` - Per creare link pubblici
- ✅ `sharing.read` - Per leggere link esistenti

**⚠️ ATTENZIONE**: Dopo aver modificato i permessi, devi **rigenerare l'Access Token**!

#### Settings (Impostazioni)

Nella tab **"Settings"**:

1. **App key**: Copia questo valore (lo userai nel .env)
2. **OAuth 2 redirect URIs**: Aggiungi `http://localhost:8765/dropbox/oauth` (per il refresh token in produzione)
3. **Generated access token**: Solo per sviluppo locale — scade dopo ~4 ore

## 📋 Passo 2: Configurare l'App

### 2.1 Crea il file .env

Nella root del progetto, crea `.env`:

```env
# Configurazione Dropbox
VITE_DROPBOX_APP_KEY=your_app_key_here
VITE_DROPBOX_ACCESS_TOKEN=your_access_token_here
VITE_DROPBOX_FOLDER=/wedding-photos
VITE_DROPBOX_REDIRECT_URI=http://localhost:5173/auth/dropbox
```

**Sostituisci i valori:**

- `your_app_key_here` → App key dal dashboard Dropbox
- `your_access_token_here` → Access token generato (solo dev, scade dopo ~4 ore)

### 2.3 Produzione su Netlify (refresh token — non scade)

```bash
npm run dropbox:auth
```

Lo script apre il browser, ottieni il refresh token e configura su Netlify:

```env
DROPBOX_APP_KEY=...
DROPBOX_APP_SECRET=...
DROPBOX_REFRESH_TOKEN=...
DROPBOX_FOLDER=/wedding-photos
```

Le Netlify Functions rinnovano automaticamente l'access token sul server.

### 2.2 Installa le Dipendenze

Il servizio Dropbox usa solo fetch nativo, nessuna dipendenza extra!

## 📋 Passo 3: Architettura dell'App

L'app usa `StorageService` come layer unificato, che delega a `DropboxService` per upload e recupero foto.

I componenti principali (`PhotoUpload`, `PhotoGallery`, `PhotoStories`) importano `StorageService` o `DropboxService` direttamente — non è necessario configurare altri provider.

## 📋 Passo 4: Test e Verifica

### 4.1 Avvia l'App

```bash
npm run dev
```

### 4.2 Testa il Caricamento

1. Vai alla pagina Upload
2. Seleziona una foto
3. Controlla la console per i log:
   - `📤 Caricando foto su Dropbox...`
   - `✅ Foto caricata su Dropbox: [nome-file]`

### 4.3 Testa la Visualizzazione

1. Vai alla Gallery
2. Dovresti vedere le foto caricate
3. Controlla i log:
   - `🔄 Recuperando foto da Dropbox...`
   - `✅ Caricate X foto da Dropbox`

### 4.4 Verifica su Dropbox

1. Vai su dropbox.com
2. Naviga alla cartella `/wedding-photos`
3. Dovresti vedere le foto caricate dall'app

## 🔧 Risoluzione Problemi

### Errore: "Access token mancante"

- Verifica che `VITE_DROPBOX_ACCESS_TOKEN` sia nel file .env
- Riavvia il server di sviluppo dopo aver modificato .env

### Errore: "Invalid access token"

- Rigenera l'access token nel dashboard Dropbox
- Assicurati che i permessi siano configurati correttamente

### Errore: HTTP 401 "missing_scope" o "files.metadata.read"

**Questo è l'errore più comune!** Significa che l'app Dropbox non ha i permessi necessari.

**Soluzione:**

1. Vai nel Dashboard della tua app Dropbox
2. Tab **"Permissions"**
3. Abilita TUTTI i permessi elencati sopra (soprattutto `files.metadata.read`)
4. **IMPORTANTE**: Vai in tab "Settings"
5. Nella sezione "Generated access token" clicca **"Generate"** di nuovo
6. Copia il NUOVO token e aggiornalo nel file `.env`
7. Riavvia l'app con `npm run dev`

**Nota**: I permessi si applicano solo ai nuovi token, non a quelli esistenti!

### Errore: "Path not found"

- La cartella `/wedding-photos` verrà creata automaticamente al primo upload
- Assicurati che il path inizi con `/`

### Foto non si caricano

- Controlla la console del browser per errori
- Verifica che il file sia un'immagine supportata
- Controlla la dimensione (max 150MB)

## 🚀 Funzionalità Extra di Dropbox

### Link di Condivisione Automatici

Ogni foto caricata ottiene automaticamente un link pubblico per la condivisione.

### Backup Automatico

Tutte le foto sono automaticamente salvate nel cloud Dropbox.

### Accesso Multi-dispositivo

Puoi accedere alle foto da qualsiasi dispositivo con l'app Dropbox.

### Eliminazione Foto

Il servizio include un metodo per eliminare foto:

```typescript
await DropboxService.deletePhoto("/wedding-photos/photo.jpg");
```

## 🎉 Vantaggi per l'App Matrimoniale

1. **Semplicità**: Gli sposi possono accedere alle foto direttamente su Dropbox
2. **Condivisione**: Link automatici per condividere con famiglia e amici
3. **Backup**: Le foto sono al sicuro nel cloud
4. **Organizzazione**: Cartella dedicata per ogni matrimonio
5. **Accesso**: Disponibili da qualsiasi dispositivo

## 🔒 Sicurezza in Produzione

In produzione usa **refresh token** sul server (Netlify Functions), non un access token nel browser:

1. Esegui `npm run dropbox:auth` per ottenere `DROPBOX_REFRESH_TOKEN`
2. Configura `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` su Netlify
3. **Non** usare `VITE_DROPBOX_ACCESS_TOKEN` in produzione

I token generati con "Generate" dalla console (`sl.u...`) scadono dopo circa 4 ore.
Il refresh token si rinnova automaticamente e non richiede intervento manuale.

---

**🎊 Setup completato!**

Le foto matrimoniali sono gestite da Dropbox: semplice, affidabile e senza problemi CORS.
