// utils/api.js
import axios from "axios";

const APP_API_BASE_URL = "https://nova.innovationpixel.com/public/api/app/";
const ROOT_API_BASE_URL = "https://nova.innovationpixel.com/public/api/";

const api = axios.create({
  baseURL: APP_API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

const getStoredAccessToken = () =>
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token") ||
  "";

const storeAccessToken = (token) => {
  const safeToken = String(token || "").trim();
  if (!safeToken) return;
  localStorage.setItem("access_token", safeToken);
  if (sessionStorage.getItem("access_token")) {
    sessionStorage.setItem("access_token", safeToken);
  }
};

const clearStoredAuth = () => {
  localStorage.removeItem("access_token");
  sessionStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("permissions");
  localStorage.removeItem("expire");
  localStorage.removeItem("nova_role");
};

const resolveAccessTokenFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return "";

  const containers = [payload, payload?.data, payload?.data?.data].filter(
    (item) => item && typeof item === "object",
  );

  for (const container of containers) {
    const token =
      container?.access_token ||
      container?.token ||
      container?.data?.access_token ||
      container?.data?.token;
    const safeToken = String(token || "").trim();
    if (safeToken) return safeToken;
  }

  return "";
};

const extractErrorMessage = (error) => {
  const payload = error?.response?.data || {};
  const firstError =
    payload?.errors && typeof payload.errors === "object"
      ? Object.values(payload.errors).flat().find(Boolean)
      : "";
  return String(
    payload?.message ||
      payload?.error ||
      payload?.msg ||
      firstError ||
      error?.message ||
      "",
  )
    .trim()
    .toLowerCase();
};

const hasEndpointNotFoundError = (error) => {
  const status = Number(error?.response?.status || 0);
  if ([404, 405].includes(status)) return true;

  const message = extractErrorMessage(error);
  if (!message) return false;

  return [
    "endpoint not found",
    "route",
    "not found",
    "does not exist",
  ].some((token) => message.includes(token));
};

const getRefreshPayloadCandidates = (accessToken) => {
  const formData = new FormData();
  formData.append("token", accessToken);
  formData.append("access_token", accessToken);

  return [
    { data: { token: accessToken, access_token: accessToken } },
    { data: { token: accessToken } },
    { data: { access_token: accessToken } },
    { data: {} },
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    },
  ];
};

const REFRESH_ENDPOINT_CANDIDATES = [
  { url: "refresh-token", baseURL: APP_API_BASE_URL },
  { url: "app/refresh-token", baseURL: ROOT_API_BASE_URL },
  { url: "refresh-token", baseURL: ROOT_API_BASE_URL },
];

const requestRefreshedAccessToken = async () => {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    throw new Error("No access token available for refresh.");
  }

  const payloadCandidates = getRefreshPayloadCandidates(accessToken);
  let lastError = null;

  for (let endpointIndex = 0; endpointIndex < REFRESH_ENDPOINT_CANDIDATES.length; endpointIndex += 1) {
    const endpoint = REFRESH_ENDPOINT_CANDIDATES[endpointIndex];
    let endpointMissing = false;

    for (let payloadIndex = 0; payloadIndex < payloadCandidates.length; payloadIndex += 1) {
      const payload = payloadCandidates[payloadIndex];
      try {
        const response = await axios({
          url: endpoint.url,
          method: "POST",
          baseURL: endpoint.baseURL,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(payload.headers || {}),
          },
          data: payload.data,
        });

        const refreshedToken = resolveAccessTokenFromPayload(response?.data);
        if (!refreshedToken) {
          throw new Error("Refresh token response missing access token.");
        }

        storeAccessToken(refreshedToken);
        return refreshedToken;
      } catch (error) {
        lastError = error;
        if (hasEndpointNotFoundError(error)) {
          endpointMissing = true;
          break;
        }

        const status = Number(error?.response?.status || 0);
        if ([401, 403].includes(status)) {
          throw error;
        }
      }
    }

    if (endpointMissing) {
      continue;
    }
  }

  throw lastError || new Error("Unable to refresh access token.");
};

const shouldSkipRefreshForRequest = (requestConfig) => {
  const url = String(requestConfig?.url || "").toLowerCase();
  return [
    "refresh-token",
    "login",
    "signup",
    "send-verification-code",
    "verify-login",
    "login-with-code",
  ].some((token) => url.includes(token));
};

let refreshPromise = null;

// TODO: NOTE: CSRF handling is temporarily disabled.
// Add request interceptor to inject token
api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = Number(error?.response?.status || 0);

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefreshForRequest(originalRequest) ||
      !getStoredAccessToken()
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = requestRefreshedAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearStoredAuth();
      return Promise.reject(refreshError);
    }
  },
);

export const request = async ({
  url,
  method = "GET",
  data = null,
  baseURL = null,
  headers = {},
}) => {
  try {
    const config = {
      url,
      method,
      baseURL: baseURL || api.defaults.baseURL,
      headers: {
        ...headers,
      },
    };

    if (data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    if (method.toUpperCase() === "GET") {
      config.params = data;
    } else {
      config.data = data;
    }

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export default api;
