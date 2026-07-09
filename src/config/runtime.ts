/**
 * In produzione usa le Netlify Functions come proxy.
 * Il token Dropbox resta solo lato server e non finisce nel bundle JS.
 */
export const USE_DROPBOX_PROXY = import.meta.env.PROD;

export const DROPBOX_PROXY = {
  status: "/.netlify/functions/dropbox-status",
  list: "/.netlify/functions/dropbox-list",
  upload: "/.netlify/functions/dropbox-upload",
  image: "/.netlify/functions/dropbox-image",
} as const;
