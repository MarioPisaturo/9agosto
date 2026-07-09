/** Foto mostrate al primo caricamento galleria (solo metadata, non i file) */
export const GALLERY_INITIAL_PAGE_SIZE = 20;

/** Foto aggiunte a ogni scroll in fondo alla galleria */
export const GALLERY_LOAD_MORE_SIZE = 12;

/** Margine IntersectionObserver per precaricare leggermente prima del viewport */
export const GALLERY_IMAGE_PRELOAD_MARGIN = "300px";

/** In stories, carica altre foto quando mancano N scatti alla fine del batch */
export const STORIES_LOAD_MORE_THRESHOLD = 5;
