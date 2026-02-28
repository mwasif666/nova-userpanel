import { request } from "../utils/api";

const ROOT_API_BASE_URL = "https://nova.innovationpixel.com/public/api/";

const endpointCandidates = (suffix) => [
  {
    url: `security-code/${suffix}`,
  },
  {
    url: `app/security-code/${suffix}`,
    baseURL: ROOT_API_BASE_URL,
  },
  {
    url: `security-code/${suffix}`,
    baseURL: ROOT_API_BASE_URL,
  },
];

const unwrapPayload = (response) => {
  if (!response || typeof response !== "object") return {};
  if (response?.data?.data && typeof response.data.data === "object") {
    return response.data.data;
  }
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response;
};

const getErrorMessage = (error) => {
  const payload = error?.response?.data || {};
  const errors = payload?.errors;
  const firstError =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().find(Boolean)
      : "";

  return String(
    payload?.message ||
      payload?.msg ||
      payload?.error ||
      firstError ||
      error?.message ||
      "",
  )
    .trim()
    .toLowerCase();
};

const hasEndpointNotFoundError = (error) => {
  const message = getErrorMessage(error);
  if (!message) return false;

  return [
    "endpoint not found",
    "route",
    "not found",
    "does not exist",
  ].some((token) => message.includes(token));
};

const callSecurityEndpoint = async ({
  suffix,
  candidates = [],
  method = "GET",
  data = null,
  fallbackStatuses = [404, 405],
  retryOnError = null,
}) => {
  const resolvedCandidates =
    Array.isArray(candidates) && candidates.length > 0
      ? candidates
      : endpointCandidates(suffix);
  let lastError = null;

  for (let index = 0; index < resolvedCandidates.length; index += 1) {
    const candidate = resolvedCandidates[index];
    try {
      const response = await request({
        url: candidate.url,
        method,
        data,
        ...(candidate.baseURL ? { baseURL: candidate.baseURL } : {}),
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      const shouldRetryByStatus = fallbackStatuses.includes(status);
      const shouldRetryByPredicate =
        hasEndpointNotFoundError(error) ||
        (typeof retryOnError === "function" && retryOnError(error));
      const tryNext =
        index < resolvedCandidates.length - 1 &&
        (shouldRetryByStatus || shouldRetryByPredicate);
      if (!tryNext) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Security code request failed.");
};

const inferStatus = (payload) => {
  const directBoolean = [
    payload?.has_security_code,
    payload?.hasSecurityCode,
    payload?.is_set,
    payload?.isSet,
    payload?.exists,
    payload?.security_code_exists,
  ].find((value) => typeof value === "boolean");

  if (typeof directBoolean === "boolean") return directBoolean;

  const numeric = Number(
    payload?.has_security_code ??
      payload?.is_set ??
      payload?.exists ??
      payload?.security_code_exists ??
      payload?.status ??
      payload?.security_status,
  );
  if (Number.isFinite(numeric)) return numeric > 0;

  const text = String(
    payload?.status || payload?.state || payload?.security_code_status || "",
  )
    .trim()
    .toLowerCase();

  if (["set", "active", "enabled", "created", "exists"].includes(text)) {
    return true;
  }
  if (["not_set", "unset", "disabled", "missing", "none"].includes(text)) {
    return false;
  }

  const messageText = String(payload?.message || payload?.msg || "")
    .trim()
    .toLowerCase();
  if (messageText) {
    if (
      ["not set", "not configured", "missing", "not found"].some((token) =>
        messageText.includes(token),
      )
    ) {
      return false;
    }
    if (
      ["configured", "set", "enabled", "active", "exists"].some((token) =>
        messageText.includes(token),
      )
    ) {
      return true;
    }
  }

  // Prefer secure default when backend response shape is unknown.
  return true;
};

export const getSecurityCodeStatus = async () => {
  const response = await callSecurityEndpoint({
    suffix: "status",
    method: "GET",
  });
  const payload = unwrapPayload(response);

  return {
    hasSecurityCode: inferStatus(payload),
    payload,
    response,
  };
};

export const createSecurityCode = async ({ securityCode, confirmCode }) =>
  callSecurityEndpoint({
    suffix: "create",
    method: "POST",
    data: {
      security_code: String(securityCode || "").trim(),
      security_code_confirmation: String(confirmCode || "").trim(),
      code: String(securityCode || "").trim(),
      code_confirmation: String(confirmCode || "").trim(),
    },
  });

export const changeSecurityCode = async ({
  currentCode,
  newCode,
  confirmCode,
}) =>
  callSecurityEndpoint({
    suffix: "change",
    method: "POST",
    data: {
      current_security_code: String(currentCode || "").trim(),
      old_security_code: String(currentCode || "").trim(),
      old_code: String(currentCode || "").trim(),
      new_security_code: String(newCode || "").trim(),
      security_code: String(newCode || "").trim(),
      new_code: String(newCode || "").trim(),
      security_code_confirmation: String(confirmCode || "").trim(),
      new_code_confirmation: String(confirmCode || "").trim(),
    },
  });

export const validateSecurityCode = async ({ securityCode }) =>
  callSecurityEndpoint({
    suffix: "validate",
    method: "POST",
    data: {
      security_code: String(securityCode || "").trim(),
      code: String(securityCode || "").trim(),
    },
  });

export const forgetSecurityCode = async ({ password = "" }) => {
  const form = new FormData();
  form.append("password", String(password || "").trim());

  return callSecurityEndpoint({
    suffix: "forget",
    method: "POST",
    fallbackStatuses: [404, 405],
    data: form,
  });
};
