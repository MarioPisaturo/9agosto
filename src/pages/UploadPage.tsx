import React from "react";
import PhotoUpload from "../components/PhotoUpload";
import type { Photo } from "../types";

interface UploadPageProps {
  onPhotoUpload: (photo: Photo) => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onPhotoUpload }) => {
  return <PhotoUpload onPhotoUpload={onPhotoUpload} />;
};

export default UploadPage;
