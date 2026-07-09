export interface Photo {
  id: string;
  url: string;
  timestamp: number;
  uploadedBy?: string;
  description?: string;
  // Metadati immagine
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface WeddingInfo {
  brideName: string;
  groomName: string;
  weddingDate: Date;
  venue: string;
}
