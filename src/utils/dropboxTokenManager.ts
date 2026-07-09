/**
 * Utility per gestire e monitorare i token Dropbox
 */

import { DROPBOX_CONFIG } from "../config/dropbox";
import { DROPBOX_PROXY, USE_DROPBOX_PROXY } from "../config/runtime";

export interface TokenStatus {
  isValid: boolean;
  isExpiring: boolean;
  expiresIn?: number;
  error?: string;
  tokenType: "app_token" | "user_token" | "unknown";
}

export class DropboxTokenManager {
  private static readonly API_BASE_URL = "https://api.dropboxapi.com/2";

  /**
   * Verifica lo stato del token corrente
   */
  static async checkTokenStatus(): Promise<TokenStatus> {
    if (!DROPBOX_CONFIG.ACCESS_TOKEN) {
      return {
        isValid: false,
        isExpiring: false,
        error: "Token non configurato",
        tokenType: "unknown",
      };
    }

    try {
      if (USE_DROPBOX_PROXY) {
        const response = await fetch(DROPBOX_PROXY.status);
        const data = await response.json();

        return {
          isValid: Boolean(data.isValid),
          isExpiring: false,
          tokenType: "app_token",
          error: data.isValid ? undefined : data.error,
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
          isExpiring: false,
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
        isExpiring: response.status === 401,
        error: `${error}: ${errorText}`,
        tokenType: "unknown",
      };
    } catch (error) {
      return {
        isValid: false,
        isExpiring: false,
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
  static getTokenRenewalInstructions(
    tokenType: TokenStatus["tokenType"]
  ): string {
    if (tokenType === "app_token") {
      return `
🔄 Il tuo App Token ha problemi. Per risolverlo:

1. Vai su https://www.dropbox.com/developers/apps
2. Clicca sulla tua app
3. Vai su "Permissions" e abilita TUTTI i permessi:
   ✅ files.metadata.read
   ✅ files.content.read  
   ✅ files.content.write
   ✅ sharing.read
   ✅ sharing.write
4. Vai su "Settings" > "OAuth 2"
5. Clicca "Generate" sotto "Generated access token"
6. Copia il nuovo token nel file .env
7. Riavvia l'applicazione

💡 IMPORTANTE: Gli App Token NON scadono mai se configurati correttamente!
   Se continua a dare problemi, verifica i permessi.
      `;
    } else {
      return `
🔄 Problema con il token Dropbox. SOLUZIONE:

1. Vai su https://www.dropbox.com/developers/apps
2. Clicca sulla tua app
3. Tab "Permissions" → abilita TUTTI i permessi e clicca "Submit"
4. Tab "Settings" > "OAuth 2" → "Generate" access token
5. Copia il token nel file .env come VITE_DROPBOX_ACCESS_TOKEN
6. Riavvia l'app (ferma e rilancia pnpm dev)

💡 Non serve mettere l'app in "Production" per questo uso.
      `;
    }
  }

  /**
   * Mostra un avviso all'utente se il token ha problemi
   */
  static async showTokenStatusIfNeeded(): Promise<void> {
    const status = await this.checkTokenStatus();

    if (!status.isValid) {
      console.warn("🚨 Problema con il token Dropbox:", status.error);

      // Mostra un avviso discreto all'utente
      const instructions = this.getTokenRenewalInstructions(status.tokenType);

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
