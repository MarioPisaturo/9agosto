import React, { useState, useEffect } from "react";
import { DropboxService } from "../services/dropboxService";

interface CacheDebugProps {
  isVisible?: boolean;
}

const CacheDebug: React.FC<CacheDebugProps> = ({ isVisible = false }) => {
  const [stats, setStats] = useState(DropboxService.getCacheStats());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setStats(DropboxService.getCacheStats());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: "300px",
        fontFamily: "monospace",
      }}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: "pointer", marginBottom: "5px" }}
      >
        📊 Cache Debug {isExpanded ? "▼" : "▶"}
      </div>

      {isExpanded && (
        <div>
          <div>🖼️ Blob Cache: {stats.blobCacheSize} items</div>
          <div>📸 Photo Cache: {stats.photoCacheSize} items</div>

          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => {
                DropboxService.clearExpiredBlobCache();
                setStats(DropboxService.getCacheStats());
              }}
              style={{
                background: "#444",
                color: "white",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                marginRight: "5px",
                cursor: "pointer",
              }}
            >
              Clean Expired
            </button>

            <button
              onClick={() => {
                DropboxService.clearAllBlobCache();
                setStats(DropboxService.getCacheStats());
              }}
              style={{
                background: "#d44",
                color: "white",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          </div>

          {stats.blobCacheItems.length > 0 && (
            <details style={{ marginTop: "10px" }}>
              <summary style={{ cursor: "pointer" }}>Cached Files</summary>
              <div
                style={{
                  maxHeight: "100px",
                  overflow: "auto",
                  marginTop: "5px",
                }}
              >
                {stats.blobCacheItems.map((item, index) => (
                  <div key={index} style={{ fontSize: "10px", opacity: 0.8 }}>
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
