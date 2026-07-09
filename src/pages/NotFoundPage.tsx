import React from "react";
import { Link } from "react-router-dom";
import "../styles/NotFoundPage.scss";

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-icon">💒</div>
        <h1>404</h1>
        <h2>Pagina Non Trovata</h2>
        <p>
          Sembra che questa pagina sia andata a fare una passeggiata romantica!
        </p>
        <div className="not-found-actions">
          <Link to="/" className="back-home-btn">
            🏠 Torna alla Home
          </Link>
          <Link to="/stories" className="view-stories-btn">
            📸 Vedi le Stories
          </Link>
        </div>
      </div>

      {/* Decorazioni romantiche */}
      <div className="romantic-decorations">
        <div className="heart heart-1">💕</div>
        <div className="heart heart-2">💖</div>
        <div className="heart heart-3">💝</div>
        <div className="ring ring-1">💍</div>
        <div className="ring ring-2">💍</div>
      </div>
    </div>
  );
};

export default NotFoundPage;
