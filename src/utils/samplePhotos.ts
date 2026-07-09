import type { Photo } from "../types";

// Sample wedding photos using placeholder images
export const samplePhotos: Photo[] = [
  {
    id: "sample_1",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop",
    timestamp: Date.now() - 3600000, // 1 hour ago
    uploadedBy: "Fotografo",
  },
  {
    id: "sample_2",
    url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&h=600&fit=crop",
    timestamp: Date.now() - 7200000, // 2 hours ago
    uploadedBy: "Mamma della sposa",
  },
  {
    id: "sample_3",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop",
    timestamp: Date.now() - 10800000, // 3 hours ago
    uploadedBy: "Testimone",
  },
  {
    id: "sample_4",
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=800&h=600&fit=crop",
    timestamp: Date.now() - 14400000, // 4 hours ago
    uploadedBy: "Zio Antonio",
  },
  {
    id: "sample_5",
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop",
    timestamp: Date.now() - 18000000, // 5 hours ago
    uploadedBy: "Cugina Laura",
  },
];

// Function to add sample photos (useful for demo)
export const addSamplePhotos = (): Photo[] => {
  return samplePhotos;
};
