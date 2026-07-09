import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import './StorageSetupGuide.scss';

interface StorageSetupGuideProps {
  onClose?: () => void;
}

const StorageSetupGuide: React.FC<StorageSetupGuideProps> = ({ onClose }) => {
  const [dropboxAvailable, setDropboxAvailable] = useState(false);
  const [dropboxError, setDropboxError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkProviderStatus();
  }, []);

  const checkProviderStatus = async () => {
    setIsLoading(true);
    try {
      const status = await StorageService.checkProviderAvailability();
      setDropboxAvailable(status.dropbox.available);
      setDropboxError(status.dropbox.error);
    } catch (error) {
      console.error('Errore nel controllo dei provider:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetest = async () => {
    await checkProviderStatus();
  };

  const getDropboxInstructions = () => {
    return `
🔧 SETUP DROPBOX - Token Permanente

1. VAI SU DROPBOX DEVELOPERS
   → https://www.dropbox.com/developers/apps

2. CREA/SELEZIONA LA TUA APP
   → Clicca "Create app" o seleziona app esistente
   → Scegli "Scoped access"
   → Scegli "Full Dropbox"
   → Dai un nome alla tua app

3. CONFIGURA I PERMESSI
   → Vai su "Permissions"
   → Abilita TUTTI questi permessi:
     ✅ files.metadata.read
     ✅ files.content.read  
     ✅ files.content.write
     ✅ sharing.read
     ✅ sharing.write

4. GENERA IL TOKEN
   → Vai su "Settings" 
   → Scorri fino a "OAuth 2"
   → Clicca "Generate" sotto "Generated access token"
   → COPIA IL TOKEN (inizia con "sl.u...")

5. AGGIORNA IL FILE .env
   → Incolla il token in VITE_DROPBOX_ACCESS_TOKEN
   → Riavvia l'applicazione

💡 QUESTO TOKEN NON SCADRÀ MAI!
   Perfetto per app matrimoniali private.
    `;
  };

  if (isLoading) {
    return (
      <div className="storage-setup-guide">
        <div className="setup-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Controllo stato servizi...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-setup-guide">
      <div className="setup-content">
        <div className="setup-header">
          <h2>🚀 Setup Servizi di Storage</h2>
          <p>Configura Dropbox per caricare e condividere le foto del matrimonio</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <div className="status-overview">
          <div className="status-cards">
            <div className={`status-card ${dropboxAvailable ? 'available' : 'unavailable'}`}>
              <div className="status-icon">
                {dropboxAvailable ? '✅' : '❌'}
              </div>
              <h3>Dropbox</h3>
              <p className="status-text">
                {dropboxAvailable
                  ? 'Configurato e funzionante'
                  : 'Richiede configurazione'}
              </p>
              {dropboxError && (
                <p className="error-text">{dropboxError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="btn-retest"
            onClick={handleRetest}
            disabled={isLoading}
          >
            🔄 Ricontrolla Stato
          </button>
        </div>

        <div className="setup-instructions">
          <div className="tab-content">
            <div className="instruction-panel">
              <div className="panel-header">
                <h3>
                  📦 Configurazione Dropbox
                  {!dropboxAvailable && (
                    <span className="required-badge">Richiesto</span>
                  )}
                </h3>
                <button
                  className="toggle-instructions"
                  onClick={() => setShowInstructions(prev => !prev)}
                >
                  {showInstructions ? 'Nascondi' : 'Mostra'} Istruzioni
                </button>
              </div>

              {showInstructions && (
                <div className="instructions-content">
                  <pre>{getDropboxInstructions()}</pre>
                  <div className="quick-actions">
                    <a
                      href="https://www.dropbox.com/developers/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-link"
                    >
                      🔗 Apri Dropbox Developers
                    </a>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(getDropboxInstructions());
                        alert('Istruzioni copiate negli appunti!');
                      }}
                    >
                      📋 Copia Istruzioni
                    </button>
                  </div>
                </div>
              )}

              <div className="benefits">
                <h4>✨ Vantaggi Dropbox:</h4>
                <ul>
                  <li>🔒 Token permanente (non scade mai)</li>
                  <li>📁 Organizzazione in cartelle</li>
                  <li>💾 Backup sicuro</li>
                  <li>🔄 Sincronizzazione automatica</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="setup-footer">
          <div className="recommendation">
            <h4>💡 Raccomandazione:</h4>
            <p>
              <strong>Configura Dropbox</strong> con un token permanente per caricare e condividere le foto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSetupGuide;
