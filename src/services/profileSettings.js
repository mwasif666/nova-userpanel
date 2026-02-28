import { request } from "../utils/api";

const ROOT_API_BASE_URL = "https://nova.innovationpixel.com/public/api/";

const callCandidates = async ({ candidates, method = "GET", data = null }) => {
  let lastError = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
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
      const shouldTryNext =
        index < candidates.length - 1 && [404, 405].includes(status);
      if (!shouldTryNext) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Profile settings request failed.");
};

const unwrap = (response) => {
  if (!response || typeof response !== "object") return {};
  if (response?.data?.data && typeof response.data.data === "object") {
    return response.data.data;
  }
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response;
};

const asBool = (value) => {
  if (typeof value === "boolean") return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 0;
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (["enabled", "active", "on", "true", "verified"].includes(text)) return true;
  if (["disabled", "inactive", "off", "false", "pending"].includes(text))
    return false;
  return false;
};

const infer2faEnabled = (payload) => {
  const directBoolean = [
    payload?.enabled,
    payload?.is_enabled,
    payload?.isEnable,
    payload?.is_google_auth_enabled,
    payload?.google_auth_enabled,
    payload?.google_authenticator_enabled,
    payload?.google_auth_active,
    payload?.google_auth_status,
    payload?.two_factor_enabled,
    payload?.two_fa_enabled,
    payload?.two_factor_authentication,
    payload?.authenticator_enabled,
    payload?.is_active,
    payload?.two_factor?.enabled,
    payload?.google_auth?.enabled,
  ].find((value) => typeof value === "boolean");
  if (typeof directBoolean === "boolean") return directBoolean;

  const numeric = Number(
    payload?.enabled ??
      payload?.is_enabled ??
      payload?.is_google_auth_enabled ??
      payload?.google_auth_enabled ??
      payload?.google_authenticator_enabled ??
      payload?.google_auth_active ??
      payload?.google_auth_status ??
      payload?.two_factor_enabled ??
      payload?.two_fa_enabled ??
      payload?.two_factor_authentication ??
      payload?.authenticator_enabled ??
      payload?.two_factor?.enabled ??
      payload?.google_auth?.enabled ??
      payload?.is_active,
  );
  if (Number.isFinite(numeric)) return numeric > 0;

  const stateText = String(
    payload?.state ||
      payload?.two_factor_state ||
      payload?.two_fa_state ||
      payload?.security_state ||
      "",
  )
    .trim()
    .toLowerCase();
  if (
    ["enabled", "active", "verified", "on", "bound", "configured"].includes(
      stateText,
    )
  ) {
    return true;
  }
  if (
    ["disabled", "inactive", "off", "unbound", "not_configured"].includes(
      stateText,
    )
  ) {
    return false;
  }

  const messageText = String(payload?.message || payload?.msg || "")
    .trim()
    .toLowerCase();
  if (
    ["already enabled", "is enabled", "enabled", "active"].some((token) =>
      messageText.includes(token),
    )
  ) {
    return true;
  }
  if (
    ["already disabled", "is disabled", "disabled", "not enabled"].some(
      (token) => messageText.includes(token),
    )
  ) {
    return false;
  }

  return asBool(payload?.status);
};

const profileEndpoints = [{ url: "me" }];

const passwordEndpoints = [
  { url: "change-password" },
  { url: "password/change" },
  { url: "profile/change-password" },
  { url: "/app/change-password", baseURL: ROOT_API_BASE_URL },
  { url: "/app/password/change", baseURL: ROOT_API_BASE_URL },
];

const passwordSendCodeEndpoints = [
  { url: "app/change-password/send-code", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-password/send-code", baseURL: ROOT_API_BASE_URL },
  { url: "change-password/send-code" },
];

const passwordConfirmEndpoints = [
  { url: "app/change-password/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-password/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "change-password/confirm" },
];

const changeEmailSendCodeCurrentEndpoints = [
  { url: "app/change-email/send-code-current", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-email/send-code-current", baseURL: ROOT_API_BASE_URL },
  { url: "change-email/send-code-current" },
];

const changeEmailVerifyCurrentEndpoints = [
  { url: "app/change-email/verify-current", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-email/verify-current", baseURL: ROOT_API_BASE_URL },
  { url: "change-email/verify-current" },
];

const changeEmailSendCodeNewEndpoints = [
  { url: "app/change-email/send-code-new", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-email/send-code-new", baseURL: ROOT_API_BASE_URL },
  { url: "change-email/send-code-new" },
];

const changeEmailConfirmEndpoints = [
  { url: "app/change-email/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-email/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "change-email/confirm" },
];

const changePhoneSendCodeEndpoints = [
  { url: "app/change-phone/send-code", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-phone/send-code", baseURL: ROOT_API_BASE_URL },
  { url: "change-phone/send-code" },
];

const changePhoneConfirmEndpoints = [
  { url: "app/change-phone/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "/app/change-phone/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "change-phone/confirm" },
];

const googleStatusEndpoints = [
  { url: "2fa/status" },
  { url: "app/2fa/status", baseURL: ROOT_API_BASE_URL },
  { url: "google-auth/status" },
  { url: "google-2fa/status" },
  { url: "two-factor/status" },
  { url: "app/google-auth/status", baseURL: ROOT_API_BASE_URL },
];

const googleSetupEndpoints = [
  { url: "2fa/setup" },
  { url: "app/2fa/setup", baseURL: ROOT_API_BASE_URL },
  { url: "google-auth/setup" },
  { url: "google-2fa/setup" },
  { url: "two-factor/setup" },
  { url: "app/google-auth/setup", baseURL: ROOT_API_BASE_URL },
];

const googleVerifyEndpoints = [
  { url: "2fa/confirm" },
  { url: "app/2fa/confirm", baseURL: ROOT_API_BASE_URL },
  { url: "google-auth/verify" },
  { url: "google-2fa/verify" },
  { url: "two-factor/verify" },
  { url: "app/google-auth/verify", baseURL: ROOT_API_BASE_URL },
];

const googleDisableEndpoints = [
  { url: "2fa/disable" },
  { url: "app/2fa/disable", baseURL: ROOT_API_BASE_URL },
  { url: "google-auth/disable" },
  { url: "google-2fa/disable" },
  { url: "two-factor/disable" },
  { url: "app/google-auth/disable", baseURL: ROOT_API_BASE_URL },
];

const googleForgetEndpoints = [
  { url: "2fa/forget" },
  { url: "app/2fa/forget", baseURL: ROOT_API_BASE_URL },
];

const resolveUserPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload?.data?.user,
    payload?.user,
    payload?.data?.profile,
    payload?.profile,
    payload?.data?.data?.user,
    payload?.data?.data,
    payload?.data,
    payload,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      continue;
    }
    if (
      candidate?.token !== undefined &&
      candidate?.id === undefined &&
      candidate?.email === undefined &&
      candidate?.name === undefined
    ) {
      continue;
    }
    return candidate;
  }

  return null;
};

export const getProfileDetails = async () => {
  const response = await callCandidates({
    candidates: profileEndpoints,
    method: "GET",
  });
  const payload = unwrap(response);
  return {
    response,
    payload,
    user: resolveUserPayload(response) || resolveUserPayload(payload),
  };
};

export const changeAccountPassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) =>
  callCandidates({
    candidates: passwordEndpoints,
    method: "POST",
    data: {
      current_password: String(currentPassword || ""),
      old_password: String(currentPassword || ""),
      password: String(newPassword || ""),
      new_password: String(newPassword || ""),
      password_confirmation: String(confirmPassword || ""),
      new_password_confirmation: String(confirmPassword || ""),
    },
  });

export const sendChangePasswordCode = async () =>
  callCandidates({
    candidates: passwordSendCodeEndpoints,
    method: "POST",
    data: new FormData(),
  });

export const confirmChangePassword = async ({
  newPassword = "",
  confirmPassword = "",
  verificationCode = "",
} = {}) => {
  const form = new FormData();
  const safeCode = String(verificationCode || "").trim();
  form.append("new_password", String(newPassword || "").trim());
  form.append("new_password_confirmation", String(confirmPassword || "").trim());
  form.append("verification_code", safeCode);
  form.append("code", safeCode);

  return callCandidates({
    candidates: passwordConfirmEndpoints,
    method: "POST",
    data: form,
  });
};

export const sendChangeEmailCodeCurrent = async () =>
  callCandidates({
    candidates: changeEmailSendCodeCurrentEndpoints,
    method: "POST",
    data: new FormData(),
  });

export const verifyChangeEmailCurrent = async ({ verificationCode = "" } = {}) => {
  const form = new FormData();
  const safeCode = String(verificationCode || "").trim();
  form.append("verification_code", safeCode);
  form.append("code", safeCode);

  return callCandidates({
    candidates: changeEmailVerifyCurrentEndpoints,
    method: "POST",
    data: form,
  });
};

export const sendChangeEmailCodeNew = async ({ newEmail = "" } = {}) => {
  const form = new FormData();
  const safeEmail = String(newEmail || "").trim();
  form.append("new_email", safeEmail);
  form.append("email", safeEmail);

  return callCandidates({
    candidates: changeEmailSendCodeNewEndpoints,
    method: "POST",
    data: form,
  });
};

export const confirmChangeEmail = async ({
  newEmail = "",
  verificationCode = "",
} = {}) => {
  const form = new FormData();
  const safeEmail = String(newEmail || "").trim();
  const safeCode = String(verificationCode || "").trim();

  form.append("new_email", safeEmail);
  form.append("email", safeEmail);
  form.append("verification_code", safeCode);
  form.append("code", safeCode);

  return callCandidates({
    candidates: changeEmailConfirmEndpoints,
    method: "POST",
    data: form,
  });
};

export const sendChangePhoneCode = async ({
  countryCode = "",
  phone = "",
} = {}) => {
  const form = new FormData();
  const safeCountryCode = String(countryCode || "").trim();
  const safePhone = String(phone || "").trim();

  form.append("code", safeCountryCode);
  form.append("country_code", safeCountryCode);
  form.append("phone", safePhone);
  form.append("new_phone", safePhone);

  return callCandidates({
    candidates: changePhoneSendCodeEndpoints,
    method: "POST",
    data: form,
  });
};

export const confirmChangePhone = async ({
  countryCode = "",
  phone = "",
  verificationCode = "",
} = {}) => {
  const form = new FormData();
  const safeCountryCode = String(countryCode || "").trim();
  const safePhone = String(phone || "").trim();
  const safeCode = String(verificationCode || "").trim();

  form.append("code", safeCountryCode);
  form.append("country_code", safeCountryCode);
  form.append("phone", safePhone);
  form.append("new_phone", safePhone);
  form.append("verification_code", safeCode);

  return callCandidates({
    candidates: changePhoneConfirmEndpoints,
    method: "POST",
    data: form,
  });
};

export const getGoogleAuthStatus = async () => {
  const response = await callCandidates({
    candidates: googleStatusEndpoints,
    method: "GET",
  });
  const payload = unwrap(response);
  const responseData =
    response?.data && typeof response.data === "object" ? response.data : {};
  const nestedData =
    responseData?.data && typeof responseData.data === "object"
      ? responseData.data
      : {};
  const mergedPayload = {
    ...responseData,
    ...nestedData,
    ...(payload && typeof payload === "object" ? payload : {}),
  };

  return {
    response,
    payload: mergedPayload,
    enabled: infer2faEnabled(mergedPayload),
    qrCode:
      mergedPayload?.qr_code ||
      mergedPayload?.qrCode ||
      mergedPayload?.qrcode ||
      mergedPayload?.google_qr_code ||
      "",
    secret:
      mergedPayload?.secret ||
      mergedPayload?.google_secret ||
      mergedPayload?.manual_entry_key ||
      "",
  };
};

export const setupGoogleAuth = async () =>
  callCandidates({
    candidates: googleSetupEndpoints,
    method: "POST",
    data: new FormData(),
  });

export const verifyGoogleAuth = async ({ otp }) => {
  const form = new FormData();
  const code = String(otp || "").trim();
  form.append("code", code);
  form.append("otp", code);
  form.append("verification_code", code);

  return callCandidates({
    candidates: googleVerifyEndpoints,
    method: "POST",
    data: form,
  });
};

export const disableGoogleAuth = async ({ otp = "" } = {}) => {
  const form = new FormData();
  const code = String(otp || "").trim();
  if (code) {
    form.append("code", code);
    form.append("otp", code);
    form.append("verification_code", code);
  }

  return callCandidates({
    candidates: googleDisableEndpoints,
    method: "POST",
    data: form,
  });
};

export const forgetGoogleAuth = async ({ password = "" } = {}) => {
  const form = new FormData();
  form.append("password", String(password || "").trim());

  return callCandidates({
    candidates: googleForgetEndpoints,
    method: "POST",
    data: form,
  });
};
