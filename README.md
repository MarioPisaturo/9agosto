# Wedding App

App per matrimonio con countdown, galleria foto, stories e upload dagli ospiti.

## Sviluppo locale

```bash
pnpm install
cp .env.example .env
# Compila VITE_DROPBOX_ACCESS_TOKEN e le altre variabili in .env
pnpm dev
```

## Deploy sicuro su Netlify

### Perché serve un proxy

Le variabili `VITE_*` finiscono nel JavaScript pubblico del browser.  
**Non mettere mai `VITE_DROPBOX_ACCESS_TOKEN` in produzione**: chiunque potrebbe rubare il token e accedere al tuo Dropbox.

In produzione l'app usa **Netlify Functions** come proxy: il token resta solo sul server.

### Passi

1. **Push del codice** su GitHub/GitLab/Bitbucket

2. **Crea un sito su Netlify**
   - [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
   - Build command: `pnpm build`
   - Publish directory: `dist`

3. **Variabili d'ambiente su Netlify** (Site settings → Environment variables)

   | Variabile | Obbligatoria | Note |
   |-----------|--------------|------|
   | `DROPBOX_APP_KEY` | Sì | App key da Dropbox Developers |
   | `DROPBOX_APP_SECRET` | Sì | App secret da Dropbox Developers |
   | `DROPBOX_REFRESH_TOKEN` | Sì | Ottenuto con `npm run dropbox:auth` |
   | `DROPBOX_FOLDER` | Sì | Es. `/wedding-app-09-08-26` |

   **Non** aggiungere `VITE_DROPBOX_ACCESS_TOKEN` su Netlify.
   **Non** usare `DROPBOX_ACCESS_TOKEN` (scade dopo ~4 ore).

4. **Deploy** → Netlify esegue build + pubblica le functions in `netlify/functions/`

5. **Verifica**
   - Apri il sito → Galleria e Upload devono funzionare
   - In DevTools → Sources: il token Dropbox **non** deve comparire nel bundle JS

### Dropbox Developers (una tantum)

1. [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Permissions → abilita `files.metadata.read`, `files.content.read`, `files.content.write`, `sharing.read`, `sharing.write` → **Submit**
3. Settings → OAuth 2 → Redirect URIs → aggiungi `http://localhost:8765/dropbox/oauth`
4. Nel progetto: `npm run dropbox:auth` → autorizza l'app → copia le variabili su Netlify
5. Fai **Trigger deploy**

I token "Generate" dalla console (`sl.u...`) scadono dopo ~4 ore. Il refresh token si rinnova automaticamente sul server.

### Routing SPA

Il file `netlify.toml` e `public/_redirects` gestiscono già le route React (`/gallery`, `/upload`, ecc.).

## Struttura

- `src/` — frontend React + Vite
- `netlify/functions/` — proxy sicuro per Dropbox (solo produzione)
- `.env` — solo sviluppo locale (mai committare)
- `.env.example` — template variabili

## Route

- `/` — Countdown matrimonio
- `/gallery` — Galleria foto
- `/upload` — Caricamento foto ospiti
- `/stories` — Stories
- `/stories?fullscreen=true` — Stories a schermo intero

## Documentazione aggiuntiva

- `DROPBOX_SETUP_GUIDE.md` — setup Dropbox dettagliato
- `DROPBOX_401_FIX.md` — fix permessi mancanti
