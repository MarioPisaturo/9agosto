import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import './StorageSetupGuide.scss';

interface StorageSetupGuideProps {
  onClose?: () => void;
}

interface ProviderStatus {
  dropbox: { available: boolean; error?: string };
  cloudinary: { available: boolean; error?: string };
}

const StorageSetupGuide: React.FC<StorageSetupGuideProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'dropbox' | 'cloudinary'>('dropbox');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    dropbox: { available: false },
    cloudinary: { available: false },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState<{
    dropbox: boolean;
    cloudinary: boolean;
  }>({ dropbox: false, cloudinary: false });

  useEffect(() => {
    checkProviderStatus();
  }, []);

  const checkProviderStatus = async () => {
    setIsLoading(true);
    try {
      const status = await StorageService.checkProviderAvailability();
      setProviderStatus(status);
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

  const getCloudinaryInstructions = () => {
    return `
🔧 SETUP CLOUDINARY - Servizio Cloud Gratuito

1. REGISTRATI SU CLOUDINARY
   → https://cloudinary.com/users/register/free
   → Account gratuito: 25GB storage, 25GB bandwidth/mese

2. OTTIENI LE CREDENZIALI
   → Vai su Dashboard dopo login
   → Trova la sezione "Account Details"
   → Copia:
     - Cloud Name
     - API Key  
     - API Secret

3. CONFIGURA IL FILE .env
   → Aggiungi queste variabili:
     VITE_CLOUDINARY_CLOUD_NAME=il_tuo_cloud_name
     VITE_CLOUDINARY_API_KEY=la_tua_api_key
     VITE_CLOUDINARY_API_SECRET=il_tuo_api_secret
     VITE_CLOUDINARY_UPLOAD_PRESET=wedding_preset

4. CREA UN UPLOAD PRESET
   → Vai su Settings > Upload
   → Clicca "Add upload preset"
   → Nome: wedding_preset
   → Signing Mode: Unsigned
   → Folder: wedding-photos
   → Tags: wedding,matrimonio

5. RIAVVIA L'APP
   → L'app rileverà automaticamente Cloudinary

🎉 VANTAGGI CLOUDINARY:
   → Ottimizzazione automatica delle immagini
   → CDN globale per caricamento veloce
   → Ridimensionamento dinamico
   → Backup sicuro nel cloud
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
          <p>Configura i servizi per caricare e condividere le foto del matrimonio</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {/* Status Overview */}
        <div className="status-overview">
          <div className="status-cards">
            <div className={`status-card ${providerStatus.dropbox.available ? 'available' : 'unavailable'}`}>
              <div className="status-icon">
                {providerStatus.dropbox.available ? '✅' : '❌'}
              </div>
              <h3>Dropbox</h3>
              <p className="status-text">
                {providerStatus.dropbox.available 
                  ? 'Configurato e funzionante' 
                  : 'Richiede configurazione'}
              </p>
              {providerStatus.dropbox.error && (
                <p className="error-text">{providerStatus.dropbox.error}</p>
              )}
            </div>

            <div className={`status-card ${providerStatus.cloudinary.available ? 'available' : 'unavailable'}`}>
              <div className="status-icon">
                {providerStatus.cloudinary.available ? '✅' : '❌'}
              </div>
              <h3>Cloudinary</h3>
              <p className="status-text">
                {providerStatus.cloudinary.available 
                  ? 'Configurato e funzionante' 
                  : 'Non ancora configurato'}
              </p>
              {providerStatus.cloudinary.error && (
                <p className="error-text">{providerStatus.cloudinary.error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-retest" 
            onClick={handleRetest}
            disabled={isLoading}
          >
            🔄 Ricontrolla Stato
          </button>
        </div>

        {/* Setup Instructions */}
        <div className="setup-instructions">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dropbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('dropbox')}
            >
              📦 Setup Dropbox
            </button>
            <button 
              className={`tab ${activeTab === 'cloudinary' ? 'active' : ''}`}
              onClick={() => setActiveTab('cloudinary')}
            >
              ☁️ Setup Cloudinary
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'dropbox' && (
              <div className="instruction-panel">
                <div className="panel-header">
                  <h3>
                    📦 Configurazione Dropbox
                    {!providerStatus.dropbox.available && (
                      <span className="required-badge">Richiesto</span>
                    )}
                  </h3>
                  <button 
                    className="toggle-instructions"
                    onClick={() => setShowInstructions(prev => ({ ...prev, dropbox: !prev.dropbox }))}
                  >
                    {showInstructions.dropbox ? 'Nascondi' : 'Mostra'} Istruzioni
                  </button>
                </div>

                {showInstructions.dropbox && (
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
            )}

            {activeTab === 'cloudinary' && (
              <div className="instruction-panel">
                <div className="panel-header">
                  <h3>
                    ☁️ Configurazione Cloudinary
                    <span className="optional-badge">Opzionale</span>
                  </h3>
                  <button 
                    className="toggle-instructions"
                    onClick={() => setShowInstructions(prev => ({ ...prev, cloudinary: !prev.cloudinary }))}
                  >
                    {showInstructions.cloudinary ? 'Nascondi' : 'Mostra'} Istruzioni
                  </button>
                </div>

                {showInstructions.cloudinary && (
                  <div className="instructions-content">
                    <pre>{getCloudinaryInstructions()}</pre>
                    <div className="quick-actions">
                      <a 
                        href="https://cloudinary.com/users/register/free" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="quick-link"
                      >
                        🔗 Registrati su Cloudinary
                      </a>
                      <button
                        className="copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(getCloudinaryInstructions());
                          alert('Istruzioni copiate negli appunti!');
                        }}
                      >
                        📋 Copia Istruzioni
                      </button>
                    </div>
                  </div>
                )}

                <div className="benefits">
                  <h4>🚀 Vantaggi Cloudinary:</h4>
                  <ul>
                    <li>🗜️ Compressione automatica intelligente</li>
                    <li>🌍 CDN globale per velocità massima</li>
                    <li>📱 Ridimensionamento dinamico</li>
                    <li>🎛️ Ottimizzazione per device</li>
                    <li>💰 Piano gratuito generoso (25GB)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="setup-footer">
          <div className="recommendation">
            <h4>💡 Raccomandazione:</h4>
            <p>
              <strong>Configura almeno Dropbox</strong> per il token permanente. 
              <br />
              <strong>Aggiungi Cloudinary</strong> per prestazioni ottimali e backup ridondante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSetupGuide;