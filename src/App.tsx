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
import { parseItalyDateTime } from "./utils/dateTime";
import {
  GALLERY_INITIAL_PAGE_SIZE,
  GALLERY_LOAD_MORE_SIZE,
} from "./config/gallery";
import { isMaintenanceMode } from "./config/maintenanceMode";
import DevDebugDock from "./components/DevDebugDock";
import "./styles/App.scss";

const weddingInfo: WeddingInfo = {
  brideName: "Annachiara",
  groomName: "Mario",
  weddingDate: parseItalyDateTime("2026-08-09", "10:30"),
  church: "Chiesa di San Sebastiano Martire, Valle Agricola",
  churchTime: "10:30",
  venue: "Villa Regina, Grottaminarda",
};

const MaintenanceAppContent: React.FC = () => (
  <Layout photoCount={0} canUpload={false} maintenanceMode>
    <DevDebugDock />
    <Routes>
      <Route
        path="/"
        element={
          <CountdownPage
            weddingInfo={weddingInfo}
            photos={[]}
            isLoadingPhotos={false}
            onLoadSamplePhotos={() => {}}
            maintenanceMode
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>
);

const AppContent: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [totalPhotosCount, setTotalPhotosCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const navigate = useNavigate();
  const { canUpload } = useUploadAccess();

  useCacheManager();

  useEffect(() => {
    const loadInitialPhotos = async () => {
      setIsLoadingPhotos(true);
      try {
        const result = await DropboxService.getWeddingPhotos(
          GALLERY_INITIAL_PAGE_SIZE,
          0
        );

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

    setTimeout(() => {
      if (photos.length === 0) {
        navigate("/stories");
      }
    }, 1000);
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const currentOffset = photos.length;
      const result = await DropboxService.getWeddingPhotos(
        GALLERY_LOAD_MORE_SIZE,
        currentOffset
      );

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
      <DevDebugDock />

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

function AppRouter() {
  if (isMaintenanceMode()) {
    return <MaintenanceAppContent />;
  }

  return <AppContent />;
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
