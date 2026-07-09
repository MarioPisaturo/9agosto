import React, { useState, useEffect } from "react";
import { DropboxTokenManager } from "../utils/dropboxTokenManager";
import type { TokenStatus } from "../utils/dropboxTokenManager";
import { USE_DROPBOX_PROXY } from "../config/runtime";
import "../styles/TokenStatusBanner.scss";

const TokenStatusBanner: React.FC = () => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // In produzione ignora eventuali errori salvati in locale da sessioni dev
    if (USE_DROPBOX_PROXY) {
      DropboxTokenManager.clearSavedTokenStatus();
    }

    const checkStatus = async () => {
      const status = await DropboxTokenManager.checkTokenStatus();
      if (!status.isValid) {
        setTokenStatus(status);
        setIsVisible(true);
      } else {
        setIsVisible(false);
        DropboxTokenManager.clearSavedTokenStatus();
      }
    };

    checkStatus();

    if (!USE_DROPBOX_PROXY) {
      const savedStatus = DropboxTokenManager.getSavedTokenStatus();
      if (savedStatus && !savedStatus.isValid) {
        setTokenStatus(savedStatus);
        setIsVisible(true);
      }
    }

    const interval = setInterval(checkStatus, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    DropboxTokenManager.clearSavedTokenStatus();
  };

  const handleRetry = async () => {
    const status = await DropboxTokenManager.checkTokenStatus();
    if (status.isValid) {
      setIsVisible(false);
      DropboxTokenManager.clearSavedTokenStatus();
    } else {
      setTokenStatus(status);
    }
  };

  if (!isVisible || !tokenStatus) {
    return null;
  }

  const getStatusIcon = () => {
    if (tokenStatus.isExpired) return "⏰";
    if (!tokenStatus.isValid) return "🚨";
    return "⚠️";
  };

  const getStatusMessage = () => {
    if (tokenStatus.isExpired) {
      return USE_DROPBOX_PROXY
        ? "Token Dropbox scaduto — configura il refresh token su Netlify"
        : "Token Dropbox scaduto — rigeneralo dalla console Dropbox";
    }
    if (!tokenStatus.isValid) {
      return "Problema con il token Dropbox";
    }
    return "Attenzione token Dropbox";
  };

  const getInstructions = () => {
    return DropboxTokenManager.getTokenRenewalInstructions();
  };

  return (
    <div className="token-status-banner">
      <div className="banner-content">
        <div className="banner-header">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="status-text">
            <h4>{getStatusMessage()}</h4>
            <p>{tokenStatus.error}</p>
          </div>
          <div className="banner-actions">
            <button
              className="btn-details"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Nascondi" : "Come risolvere"}
            </button>
            <button className="btn-retry" onClick={handleRetry}>
              Riprova
            </button>
            <button className="btn-dismiss" onClick={handleDismiss}>
              ✕
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="banner-details">
            <h5>🔧 Come risolvere:</h5>
            <pre>{getInstructions()}</pre>

            <div className="quick-links">
              <a
                href="https://www.dropbox.com/developers/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="quick-link"
              >
                🔗 Apri Dropbox Developers
              </a>
              <button
                className="quick-link"
                onClick={() => {
                  navigator.clipboard.writeText(getInstructions());
                  alert("Istruzioni copiate negli appunti!");
                }}
              >
                📋 Copia istruzioni
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenStatusBanner;
