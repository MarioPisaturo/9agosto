import React from "react";
import { Link } from "react-router-dom";
import { formatPhotoBadge } from "../utils/photoCount";
import "../styles/Navigation.scss";

interface NavigationProps {
  activeSection: string;
  photoCount: number;
  hasMorePhotos?: boolean;
  canUpload: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  activeSection,
  photoCount,
  hasMorePhotos = false,
  canUpload,
}) => {
  const navItems = [
    { id: "countdown", label: "Countdown", icon: "💒", path: "/" },
    { id: "gallery", label: "Galleria", icon: "🖼️", path: "/gallery" },
    ...(canUpload
      ? [{ id: "upload", label: "Carica", icon: "📷", path: "/upload" }]
      : []),
    { id: "stories", label: "Momenti", icon: "✨", path: "/stories" },
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.id === "stories" && photoCount > 0 && (
              <span className="photo-badge">
                {formatPhotoBadge(photoCount, hasMorePhotos)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
