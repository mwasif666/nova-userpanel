const DEFAULT_BACKEND_API_URL = "https://nova.innovationpixel.com/public/api";

export const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_API_URL;

const normalizedApiBase = API_BASE_URL.replace(/\/+$/, "");
export const API_ROOT_URL = normalizedApiBase
  ? `${normalizedApiBase.replace(/\/api$/i, "")}/`
  : "";

export const IMAGE_BASE_URL =
  process.env.REACT_APP_BACKEND_URL_IMAGE || process.env.BACKEND_URL_IMAGE || "";

// Keep config usable in local/dev even when .env is missing by falling back to
// the hosted API base above. Override via REACT_APP_BACKEND_URL when needed.
