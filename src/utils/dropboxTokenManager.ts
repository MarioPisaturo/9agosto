/**
 * Utility per gestire e monitorare i token Dropbox
 */

import { DROPBOX_CONFIG } from "../config/dropbox";
import { DROPBOX_PROXY, USE_DROPBOX_PROXY } from "../config/runtime";

export interface TokenStatus {
  isValid: boolean;
  isExpired: boolean;
  authMode?: "refresh" | "static";
  error?: string;
  tokenType: "app_token" | "user_token" | "unknown";
}

function isExpiredAccessTokenError(error?: string): boolean {
  if (!error) return false;
  return (
    error.includes("expired_access_token") ||
    error.includes("Token scaduto")
  );
}

export class DropboxTokenManager {
  private static readonly API_BASE_URL = "https://api.dropboxapi.com/2";

  /**
   * Verifica lo stato del token corrente
   */
  static async checkTokenStatus(): Promise<TokenStatus> {
    try {
      if (USE_DROPBOX_PROXY) {
        const response = await fetch(DROPBOX_PROXY.status);

        if (!response.ok) {
          const errorText = await response.text();
          let error = errorText;
          try {
            const data = JSON.parse(errorText);
            error = data.error || errorText;
          } catch {
            // usa errorText così com'è
          }

          return {
            isValid: false,
            isExpired: isExpiredAccessTokenError(error),
            error,
            tokenType: "unknown",
          };
        }

        const data = await response.json();

        return {
          isValid: Boolean(data.isValid),
          isExpired: isExpiredAccessTokenError(data.error),
          authMode: data.authMode,
          tokenType: "app_token",
          error: data.isValid ? undefined : data.error,
        };
      }

      if (!DROPBOX_CONFIG.ACCESS_TOKEN) {
        return {
          isValid: false,
          isExpired: false,
          error: "Token non configurato nel file .env locale",
          tokenType: "unknown",
        };
      }

      // check/user è più affidabile dal browser (richiede body JSON esplicito)
      const response = await fetch(`${this.API_BASE_URL}/check/user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      if (response.ok) {
        return {
          isValid: true,
          isExpired: false,
          tokenType: "app_token",
          error: undefined,
        };
      }

      const errorText = await response.text();
      let error = `HTTP ${response.status}`;

      if (response.status === 401) {
        error = "Token scaduto o non valido";
      } else if (response.status === 429) {
        error = "Rate limit raggiunto, riprova tra poco";
      } else if (response.status === 500) {
        error =
          "Errore Dropbox: token malformato o permessi non configurati. Rigenera il token dopo aver salvato i permessi.";
      }

      return {
        isValid: false,
        isExpired: isExpiredAccessTokenError(errorText) || response.status === 401,
        error: `${error}: ${errorText}`,
        tokenType: "unknown",
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: false,
        error: `Errore di rete: ${
          error instanceof Error ? error.message : "Sconosciuto"
        }`,
        tokenType: "unknown",
      };
    }
  }

  /**
   * Verifica se il token corrente è un token permanente
   */
  static async isTokenPermanent(): Promise<boolean> {
    try {
      const status = await this.checkTokenStatus();
      return status.isValid && status.tokenType === "app_token";
    } catch (error) {
      console.warn("Impossibile verificare se il token è permanente:", error);
      return false;
    }
  }

  /**
   * Genera istruzioni per rinnovare il token
   */
  static getTokenRenewalInstructions(): string {
    if (USE_DROPBOX_PROXY) {
      return `
🔄 Configura il refresh token Dropbox su Netlify (non scade):

1. Nella dashboard Dropbox → Settings → OAuth 2 → Redirect URIs aggiungi:
   http://localhost:8765/dropbox/oauth

2. Nel progetto esegui:
   node scripts/dropbox-auth.mjs

3. Su Netlify → Site settings → Environment variables aggiungi:
   DROPBOX_APP_KEY = la tua app key
   DROPBOX_APP_SECRET = il tuo app secret
   DROPBOX_REFRESH_TOKEN = il refresh token ottenuto
   DROPBOX_FOLDER = /wedding-app-09-08-26

4. Rimuovi DROPBOX_ACCESS_TOKEN (scade dopo ~4 ore)
5. NON usare VITE_DROPBOX_ACCESS_TOKEN in produzione
6. Fai Trigger deploy

💡 I token "Generate" (sl.u...) dalla console Dropbox scadono dopo ~4 ore.
   Il refresh token si rinnova automaticamente sul server.
      `;
    }

    return `
🔄 Token Dropbox scaduto in sviluppo locale:

1. Vai su https://www.dropbox.com/developers/apps
2. Tab "Permissions" → abilita tutti i permessi → Submit
3. Tab "Settings" → OAuth 2 → Generate (nuovo access token)
4. Aggiorna VITE_DROPBOX_ACCESS_TOKEN nel file .env
5. Riavvia npm run dev

💡 I token dalla console (sl.u...) scadono dopo ~4 ore.
   Per produzione usa: node scripts/dropbox-auth.mjs
   e configura DROPBOX_REFRESH_TOKEN su Netlify.
    `;
  }

  /**
   * Mostra un avviso all'utente se il token ha problemi
   */
  static async showTokenStatusIfNeeded(): Promise<void> {
    const status = await this.checkTokenStatus();

    if (!status.isValid) {
      console.warn("🚨 Problema con il token Dropbox:", status.error);

      // Mostra un avviso discreto all'utente
      const instructions = this.getTokenRenewalInstructions();

      // In un'app reale, potresti mostrare questo in un toast o modal
      console.info(instructions);

      // Opzionalmente, salva lo stato per mostrare un banner nell'UI
      localStorage.setItem("dropbox_token_status", JSON.stringify(status));
    } else {
      console.log("✅ Token Dropbox valido");
      localStorage.removeItem("dropbox_token_status");
    }
  }

  /**
   * Ottiene lo stato del token salvato (per l'UI)
   */
  static getSavedTokenStatus(): TokenStatus | null {
    const saved = localStorage.getItem("dropbox_token_status");
    return saved ? JSON.parse(saved) : null;
  }

  /**
   * Pulisce lo stato del token salvato
   */
  static clearSavedTokenStatus(): void {
    localStorage.removeItem("dropbox_token_status");
  }
}

/**
 * Hook per verificare periodicamente lo stato del token
 */
export const useTokenMonitoring = (intervalMinutes: number = 30) => {
  if (typeof window !== "undefined") {
    // Verifica iniziale
    DropboxTokenManager.showTokenStatusIfNeeded();

    // Verifica periodica
    const interval = setInterval(() => {
      DropboxTokenManager.showTokenStatusIfNeeded();
    }, intervalMinutes * 60 * 1000);

    // Cleanup
    return () => clearInterval(interval);
  }

  return () => {};
};
