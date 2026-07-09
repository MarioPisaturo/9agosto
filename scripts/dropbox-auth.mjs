#!/usr/bin/env node
/**
 * Ottiene un refresh token Dropbox (non scade) per la produzione su Netlify.
 *
 * Prerequisiti nella dashboard Dropbox (Settings → OAuth 2 → Redirect URIs):
 *   http://localhost:8765/dropbox/oauth
 *
 * Uso:
 *   node scripts/dropbox-auth.mjs
 *   node scripts/dropbox-auth.mjs --app-key=xxx --app-secret=yyy
 *
 * Legge DROPBOX_APP_KEY e DROPBOX_APP_SECRET da .env se presenti.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REDIRECT_URI = "http://localhost:8765/dropbox/oauth";
const PORT = 8765;
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

function loadEnvFile() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function required(value, label) {
  if (!value?.trim()) {
    console.error(`\n❌ ${label} mancante.`);
    console.error(
      "   Passalo come argomento o impostalo in .env (DROPBOX_APP_KEY / DROPBOX_APP_SECRET).\n"
    );
    process.exit(1);
  }
  return value.trim();
}

loadEnvFile();

const appKey = required(
  readArg("app-key") ||
    process.env.DROPBOX_APP_KEY ||
    process.env.VITE_DROPBOX_APP_KEY,
  "App key"
);
const appSecret = required(
  readArg("app-secret") || process.env.DROPBOX_APP_SECRET,
  "App secret"
);

const authUrl = new URL("https://www.dropbox.com/oauth2/authorize");
authUrl.searchParams.set("client_id", appKey);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("token_access_type", "offline");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

console.log("\n🔐 Setup refresh token Dropbox\n");
console.log("1. Assicurati che questo redirect URI sia nella tua app Dropbox:");
console.log(`   ${REDIRECT_URI}`);
console.log("\n2. Apri questo link nel browser e autorizza l'app:\n");
console.log(`   ${authUrl.toString()}\n`);
console.log("3. Attendo il redirect su localhost...\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname !== "/dropbox/oauth") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Errore autorizzazione</h1><p>${error}</p>`);
    console.error(`❌ Autorizzazione rifiutata: ${error}`);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Codice mancante</h1>");
    return;
  }

  try {
    const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString("base64");
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(JSON.stringify(data));
    }

    if (!data.refresh_token) {
      throw new Error(
        "Nessun refresh_token nella risposta. Verifica token_access_type=offline e che non abbia già autorizzato l'app (revoca da dropbox.com/account/connected_apps e riprova)."
      );
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>✅ Autorizzazione completata</h1><p>Puoi chiudere questa finestra e tornare al terminale.</p>"
    );

    console.log("✅ Refresh token ottenuto!\n");
    console.log("Aggiungi queste variabili su Netlify (Site settings → Environment variables):\n");
    console.log(`DROPBOX_APP_KEY=${appKey}`);
    console.log(`DROPBOX_APP_SECRET=${appSecret}`);
    console.log(`DROPBOX_REFRESH_TOKEN=${data.refresh_token}`);
    console.log("DROPBOX_FOLDER=/wedding-app-09-08-26  # o la tua cartella\n");
    console.log("⚠️  NON serve più DROPBOX_ACCESS_TOKEN in produzione.");
    console.log("    Rimuovilo da Netlify dopo il deploy.\n");
    console.log("Poi fai Trigger deploy su Netlify.\n");

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Errore</h1><p>Vedi il terminale per i dettagli.</p>");
    console.error("❌ Errore nello scambio del codice:", err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ La porta ${PORT} è occupata. Chiudi l'altro processo o modifica PORT nello script.\n`
    );
  } else {
    console.error("❌ Errore server:", err);
  }
  process.exit(1);
});
