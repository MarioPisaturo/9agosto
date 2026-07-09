import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  grantUploadAccess,
  hasUploadAccess,
  isValidUploadToken,
  readUploadTokenFromSearch,
  resolveUploadAccessFromUrl,
  shouldStripUploadParamFromUrl,
  stripUploadParamFromSearch,
} from "../utils/uploadAccess";

/**
 * Gestisce l'accesso al tab Carica in base a uploadAccess config (.env).
 */
export function useUploadAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [canUpload, setCanUpload] = useState(() =>
    resolveUploadAccessFromUrl()
  );

  useEffect(() => {
    const token = readUploadTokenFromSearch(location.search);

    if (token) {
      if (isValidUploadToken(token)) {
        grantUploadAccess();
        setCanUpload(true);
      }

      if (shouldStripUploadParamFromUrl()) {
        const nextSearch = stripUploadParamFromSearch(location.search);
        if (nextSearch !== location.search) {
          navigate(`${location.pathname}${nextSearch}`, { replace: true });
        }
      }
      return;
    }

    setCanUpload(hasUploadAccess());
  }, [location.pathname, location.search, navigate]);

  return { canUpload };
}
