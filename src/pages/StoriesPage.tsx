import React from "react";
import PhotoStories from "../components/PhotoStories";
import type { Photo } from "../types";

interface StoriesPageProps {
  photos: Photo[];
  isLoadingPhotos: boolean;
}

const StoriesPage: React.FC<StoriesPageProps> = ({
  photos,
  isLoadingPhotos,
}) => {
  return <PhotoStories photos={photos} isLoadingPhotos={isLoadingPhotos} />;
};

export default StoriesPage;
