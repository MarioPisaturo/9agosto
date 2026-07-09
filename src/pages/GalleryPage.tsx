import React from "react";
import PhotoGallery from "../components/PhotoGallery";
import type { Photo } from "../types";

interface GalleryPageProps {
  photos: Photo[];
  hasMorePhotos: boolean;
  isLoadingMore: boolean;
  totalPhotosCount: number;
  onLoadMore: () => void;
}

const GalleryPage: React.FC<GalleryPageProps> = ({
  photos,
  hasMorePhotos,
  isLoadingMore,
  totalPhotosCount,
  onLoadMore,
}) => {
  return (
    <PhotoGallery
      photos={photos}
      hasMorePhotos={hasMorePhotos}
      isLoadingMore={isLoadingMore}
      totalCount={totalPhotosCount}
      onLoadMore={onLoadMore}
    />
  );
};

export default GalleryPage;
