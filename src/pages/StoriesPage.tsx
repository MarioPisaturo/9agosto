import React from "react";
import PhotoStories from "../components/PhotoStories";
import type { Photo } from "../types";

interface StoriesPageProps {
  photos: Photo[];
}

const StoriesPage: React.FC<StoriesPageProps> = ({ photos }) => {
  return <PhotoStories photos={photos} />;
};

export default StoriesPage;
