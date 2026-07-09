import React from "react";
import PhotoStories from "../components/PhotoStories";
import type { Photo } from "../types";

interface StoriesPageProps {
  photos: Photo[];
  hasMorePhotos: boolean;
  isLoadingPhotos: boolean;
  isLoadingMore: boolean;
  totalPhotosCount: number;
  onLoadMore: () => void;
}

const StoriesPage: React.FC<StoriesPageProps> = ({
  photos,
  hasMorePhotos,
  isLoadingPhotos,
  isLoadingMore,
  totalPhotosCount,
  onLoadMore,
}) => {
  return (
    <PhotoStories
      photos={photos}
      hasMorePhotos={hasMorePhotos}
      isLoadingPhotos={isLoadingPhotos}
      isLoadingMore={isLoadingMore}
      totalPhotosCount={totalPhotosCount}
      onLoadMore={onLoadMore}
    />
  );
};

export default StoriesPage;
