import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasFullscreenParam } from "../utils/fullscreenUtils";

// Hook personalizzato per gestire il fullscreen con React Router
export const useFullscreenRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Verifica se il parametro fullscreen è presente
  const shouldActivateFullscreen = hasFullscreenParam();

  // Funzione per navigare alle stories con fullscreen
  const navigateToStoriesFullscreen = useCallback(() => {
    navigate("/stories?fullscreen=true");
  }, [navigate]);

  // Funzione per rimuovere il parametro fullscreen dalla URL corrente
  const clearFullscreenParam = useCallback(() => {
    if (shouldActivateFullscreen) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("fullscreen");
      navigate(location.pathname + newUrl.search, { replace: true });
    }
  }, [shouldActivateFullscreen, location.pathname, navigate]);

  return {
    shouldActivateFullscreen,
    navigateToStoriesFullscreen,
    clearFullscreenParam,
    currentPath: location.pathname,
  };
};
