import React, { useState, useEffect } from "react";
import { DropboxService } from "../services/dropboxService";

const CacheDebug: React.FC = () => {
  const [stats, setStats] = useState(DropboxService.getCacheStats());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(DropboxService.getCacheStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cache-debug-panel">
      <div
        className="cache-debug-panel__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        📊 Cache Debug {isExpanded ? "▼" : "▶"}
      </div>

      {isExpanded && (
        <div>
          <div>🖼️ Blob Cache: {stats.blobCacheSize} items</div>
          <div>📸 Photo Cache: {stats.photoCacheSize} items</div>

          <div className="cache-debug-panel__actions">
            <button
              type="button"
              className="cache-debug-panel__btn"
              onClick={() => {
                DropboxService.clearExpiredBlobCache();
                setStats(DropboxService.getCacheStats());
              }}
            >
              Clean Expired
            </button>

            <button
              type="button"
              className="cache-debug-panel__btn cache-debug-panel__btn--danger"
              onClick={() => {
                DropboxService.clearAllBlobCache();
                setStats(DropboxService.getCacheStats());
              }}
            >
              Clear All
            </button>
          </div>

          {stats.blobCacheItems.length > 0 && (
            <details style={{ marginTop: "10px" }}>
              <summary style={{ cursor: "pointer" }}>Cached Files</summary>
              <div className="cache-debug-panel__files">
                {stats.blobCacheItems.map((item, index) => (
                  <div key={index} className="cache-debug-panel__file">
                    {item.split("/").pop()}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CacheDebug;
