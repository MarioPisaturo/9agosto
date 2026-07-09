import React from "react";
import PhotoGallery from "../components/PhotoGallery";
import type { Photo } from "../types";

interface GalleryPageProps {
  photos: Photo[];
  hasMorePhotos: boolean;
  isLoadingPhotos: boolean;
  isLoadingMore: boolean;
  totalPhotosCount: number;
  onLoadMore: () => void;
}

const GalleryPage: React.FC<GalleryPageProps> = ({
  photos,
  hasMorePhotos,
  isLoadingPhotos,
  isLoadingMore,
  totalPhotosCount,
  onLoadMore,
}) => {
  return (
    <PhotoGallery
      photos={photos}
      hasMorePhotos={hasMorePhotos}
      isLoadingPhotos={isLoadingPhotos}
      isLoadingMore={isLoadingMore}
      totalCount={totalPhotosCount}
      onLoadMore={onLoadMore}
    />
  );
};

export default GalleryPage;
