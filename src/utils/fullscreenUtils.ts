// Funzioni di utilità per la gestione del fullscreen con querystring

// Funzione di utilità per creare link diretti al fullscreen
export const createFullscreenLink = (
  baseUrl?: string,
  routePath?: string
): string => {
  const url = new URL(baseUrl || window.location.href);

  // Se viene specificato un percorso di route, aggiornalo
  if (routePath) {
    url.pathname = routePath;
  } else if (url.pathname === "/" || url.pathname === "/countdown") {
    // Se siamo nella homepage, reindirizza alle stories per il fullscreen
    url.pathname = "/stories";
  }

  url.searchParams.set("fullscreen", "true");
  return url.toString();
};

// Funzione di utilità per verificare se è attivo il parametro fullscreen
export const hasFullscreenParam = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("fullscreen") === "true";
};

// Funzione di utilità per rimuovere il parametro fullscreen dalla URL
export const removeFullscreenParam = (): void => {
  if (window.location.search.includes("fullscreen=true")) {
    const url = new URL(window.location.href);
    url.searchParams.delete("fullscreen");
    window.history.replaceState({}, "", url.toString());
  }
};

// Funzione di utilità per aggiungere il parametro fullscreen alla URL
export const addFullscreenParam = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.set("fullscreen", "true");
  window.history.replaceState({}, "", url.toString());
};
