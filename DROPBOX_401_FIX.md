# 🚨 Fix Rapido: Errore 401 Dropbox

## Errore Ricevuto

```
Errore HTTP 401: {"error":{".tag":"missing_scope","required_scope":"files.metadata.read"},"error_summary":"missing_scope/"}
```

## 🎯 Causa

L'app Dropbox non ha i permessi necessari per leggere i metadati dei file.

## ⚡ Soluzione Rapida (2 minuti)

### Passo 1: Vai nel Dashboard Dropbox

1. Apri https://www.dropbox.com/developers/apps
2. Clicca sulla tua app (`wedding-app` o come l'hai chiamata)

### Passo 2: Configura i Permessi

1. Vai nella tab **"Permissions"**
2. Abilita TUTTI questi permessi:
   - ✅ `files.content.write`
   - ✅ `files.content.read`
   - ✅ `files.metadata.write`
   - ✅ `files.metadata.read` ← **QUESTO È QUELLO MANCANTE!**
   - ✅ `sharing.write`
   - ✅ `sharing.read`

### Passo 3: Rigenera l'Access Token

1. Vai nella tab **"Settings"**
2. Scorri fino a "Generated access token"
3. Clicca **"Generate"** (sostituirà il token precedente)
4. **Copia il nuovo token**

### Passo 4: Aggiorna il File .env

```env
# Sostituisci con il NUOVO token
VITE_DROPBOX_ACCESS_TOKEN=il_nuovo_token_qui
```

### Passo 5: Riavvia l'App

```bash
npm run dev
```

## ✅ Verifica

Dopo aver fatto questi passi:

1. Vai alla Gallery dell'app
2. Non dovresti più vedere l'errore 401
3. Le foto dovrebbero caricarsi correttamente

## 📝 Nota Importante

**I permessi si applicano solo ai nuovi token!** Se modifichi i permessi di un'app esistente, DEVI rigenerare l'access token.

## 🆘 Se Continua a Non Funzionare

### Controlla la Console

Apri gli Strumenti per Sviluppatori del browser (F12) e guarda la console per altri errori.

### Verifica il Token

Assicurati che:

- Il token nel `.env` sia quello nuovo
- Non ci siano spazi extra prima/dopo il token
- Il file `.env` sia nella root del progetto

### Riavvia Tutto

```bash
# Ferma l'app (Ctrl+C)
# Poi riavvia
npm run dev
```

## 🎉 Risultato Atteso

Dopo la correzione vedrai nella console:

```
🔄 Recuperando tutte le foto da Dropbox...
✅ Trovate X foto su Dropbox
```

---

**Questo fix risolve il 99% dei problemi 401 con Dropbox!**
