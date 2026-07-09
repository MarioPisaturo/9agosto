import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import CountdownPage from "./pages/CountdownPage";
import GalleryPage from "./pages/GalleryPage";
import UploadPage from "./pages/UploadPage";
import StoriesPage from "./pages/StoriesPage";
import NotFoundPage from "./pages/NotFoundPage";
import type { Photo, WeddingInfo } from "./types";
import { DropboxService } from "./services/dropboxService";
import { samplePhotos } from "./utils/samplePhotos";
import { useCacheManager } from "./hooks/useCacheManager";
import { useUploadAccess } from "./hooks/useUploadAccess";
import CacheDebug from "./components/CacheDebug";
import "./styles/App.scss";

// Componente wrapper per la logica dell'app
const AppContent: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);

  const [totalPhotosCount, setTotalPhotosCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const navigate = useNavigate();
  const { canUpload } = useUploadAccess();

  // Gestione automatica della cache
  useCacheManager();

  // Wedding information - customize these values
  const weddingInfo: WeddingInfo = {
    brideName: "Annachiara",
    groomName: "Mario",
    weddingDate: new Date("2026-08-09T10:00:00"), // Customize this date
    venue: "Villa Regina, Grottaminarda",
  };

  // Load initial photos from Dropbox on component mount
  useEffect(() => {
    const loadInitialPhotos = async () => {
      setIsLoadingPhotos(true);
      try {
        const result = await DropboxService.getWeddingPhotos(100, 0);

        // Converti le foto di Dropbox nel formato dell'app
        const convertedPhotos: Photo[] = result.photos.map((photo) => ({
          id: photo.public_id,
          url: photo.secure_url,
          timestamp: new Date(photo.created_at).getTime(),
          uploadedBy: photo.metadata?.uploadedBy || "Ospite",
          description: photo.metadata?.description,
          publicId: photo.public_id,
          width: photo.width,
          height: photo.height,
          bytes: photo.bytes,
        }));

        setPhotos(convertedPhotos);
        setHasMorePhotos(result.hasMore);
        setTotalPhotosCount(result.totalCount);
      } catch (error) {
        console.error("Errore nel caricamento delle foto da Dropbox:", error);
        // Fallback: carica foto demo locali in caso di errore
        setPhotos([]);
        setHasMorePhotos(false);
        setTotalPhotosCount(0);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    loadInitialPhotos();
  }, []);

  const handlePhotoUpload = (newPhoto: Photo) => {
    setPhotos((prevPhotos) => [newPhoto, ...prevPhotos]);
    setTotalPhotosCount((prev) => prev + 1);

    // Show a success message and optionally switch to stories
    setTimeout(() => {
      if (photos.length === 0) {
        // If it's the first photo, navigate to stories
        navigate("/stories");
      }
    }, 1000);
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const currentOffset = photos.length;
      const result = await DropboxService.getWeddingPhotos(5, currentOffset);

      // Converti le nuove foto di Dropbox nel formato dell'app
      const newConvertedPhotos: Photo[] = result.photos.map((photo) => ({
        id: photo.public_id,
        url: photo.secure_url,
        timestamp: new Date(photo.created_at).getTime(),
        uploadedBy: photo.metadata?.uploadedBy || "Ospite",
        description: photo.metadata?.description,
        publicId: photo.public_id,
        width: photo.width,
        height: photo.height,
        bytes: photo.bytes,
      }));

      // Aggiungi le nuove foto a quelle esistenti
      setPhotos((prevPhotos) => [...prevPhotos, ...newConvertedPhotos]);
      setHasMorePhotos(result.hasMore);
    } catch (error) {
      console.error("Errore nel caricamento di altre foto:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadSamplePhotos = () => {
    setPhotos(samplePhotos);
    navigate("/stories");
  };

  return (
    <Layout photoCount={photos.length} canUpload={canUpload}>
      {/* Debug della cache solo in development */}
      <CacheDebug isVisible={import.meta.env.DEV} />

      <Routes>
        <Route
          path="/"
          element={
            <CountdownPage
              weddingInfo={weddingInfo}
              photos={photos}
              isLoadingPhotos={isLoadingPhotos}
              onLoadSamplePhotos={loadSamplePhotos}
            />
          }
        />
        <Route path="/countdown" element={<Navigate to="/" replace />} />
        <Route
          path="/gallery"
          element={
            <GalleryPage
              photos={photos}
              hasMorePhotos={hasMorePhotos}
              isLoadingPhotos={isLoadingPhotos}
              isLoadingMore={isLoadingMore}
              totalPhotosCount={totalPhotosCount}
              onLoadMore={loadMorePhotos}
            />
          }
        />
        <Route
          path="/upload"
          element={
            canUpload ? (
              <UploadPage onPhotoUpload={handlePhotoUpload} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/stories"
          element={
            <StoriesPage photos={photos} isLoadingPhotos={isLoadingPhotos} />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

// Componente App principale con Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
