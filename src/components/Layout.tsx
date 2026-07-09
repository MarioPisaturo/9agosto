import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import TokenStatusBanner from "./TokenStatusBanner";
import { hasFullscreenParam } from "../utils/fullscreenUtils";

interface LayoutProps {
  photoCount: number;
  canUpload: boolean;
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  photoCount,
  canUpload,
  children,
}) => {
  const location = useLocation();
  const isFullscreen = hasFullscreenParam();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  // Hook per rilevare i cambiamenti di dimensione della finestra
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Aggiungi listener per il resize
    window.addEventListener("resize", handleResize);

    // Cleanup del listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Hook per rilevare quando si entra/esce dalla modalità fullscreen del browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };

    // Aggiungi listener per i cambiamenti di fullscreen
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Cleanup dei listener
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  // Estrai la sezione attiva dal pathname
  const getActiveSection = () => {
    const path = location.pathname;
    if (path === "/" || path === "/countdown") return "countdown";
    if (path === "/gallery") return "gallery";
    if (path === "/upload") return "upload";
    if (path === "/stories") return "stories";
    return "countdown";
  };

  // Nascondi la navigazione in fullscreen su mobile
  // Considera sia il parametro URL fullscreen (?fullscreen=true) che la modalità fullscreen del browser (F11)
  // Questo migliora l'esperienza utente nascondendo completamente l'interfaccia di navigazione
  const shouldHideNavigation =
    isMobile && (isFullscreen || isBrowserFullscreen);

  return (
    <div className={`app ${shouldHideNavigation ? "fullscreen-mobile" : ""}`}>
      {/* Banner per problemi con il token - sempre visibile */}
      <TokenStatusBanner />

      <main className="app-main">{children || <Outlet />}</main>

      {!shouldHideNavigation && (
        <Navigation
          activeSection={getActiveSection()}
          photoCount={photoCount}
          canUpload={canUpload}
        />
      )}

      {/* Wedding rings floating animation - nascondi anche questi in fullscreen */}
      {!shouldHideNavigation && (
        <div className="floating-rings">
          <div className="ring ring-1">💍</div>
          <div className="ring ring-2">💍</div>
          <div className="ring ring-3">💍</div>
        </div>
      )}
    </div>
  );
};

export default Layout;
