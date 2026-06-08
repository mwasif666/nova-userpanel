import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { AuthContext } from "../../../context/authContext";
import {
  changeSecurityCode,
  createSecurityCode,
  forgetSecurityCode,
  sendSecurityForgetCode,
  getSecurityCodeStatus,
  validateSecurityCode,
} from "../../../services/securityCode";
import {
  confirmChangeEmail,
  confirmChangePassword,
  confirmChangePhone,
  disableGoogleAuth,
  forgetGoogleAuth,
  getGoogleAuthStatus,
  getProfileDetails,
  sendChangeEmailCodeCurrent,
  sendChangeEmailCodeNew,
  sendChangePasswordCode,
  sendChangePhoneCode,
  setupGoogleAuth,
  verifyChangeEmailCurrent,
  verifyGoogleAuth,
} from "../../../services/profileSettings";

const TAB_ITEMS = [
  {
    key: "profile",
    title: "Profile",
    sub: "Account info from API",
    icon: "pi pi-user",
  },
  {
    key: "email",
    title: "Change Email",
    sub: "Bind and verify email",
    icon: "pi pi-envelope",
  },
  {
    key: "phone",
    title: "Change Phone",
    sub: "Bind and verify phone",
    icon: "pi pi-phone",
  },
  {
    key: "password",
    title: "Change Password",
    sub: "Update login password",
    icon: "pi pi-lock",
  },
  {
    key: "security",
    title: "Security Code",
    sub: "Create / Change / Validate",
    icon: "pi pi-shield",
  },
  {
    key: "google",
    title: "Google Auth",
    sub: "2FA setup and verification",
    icon: "pi pi-mobile",
  },
];

const findFirstFieldError = (errorBag) => {
  if (!errorBag || typeof errorBag !== "object") return "";

  for (const value of Object.values(errorBag)) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string" && item.trim());
      if (first) return first.trim();
      continue;
    }

    if (typeof value === "string" && value.trim()) return value.trim();

    const nested = findFirstFieldError(value);
    if (nested) return nested;
  }

  return "";
};

const getApiError = (error, fallback) => {
  const payload = error?.response?.data || {};
  const fieldError =
    findFirstFieldError(payload?.errors) ||
    findFirstFieldError(payload?.error) ||
    findFirstFieldError(payload?.data?.errors) ||
    findFirstFieldError(payload?.data?.error);

  return fieldError || payload?.message || payload?.msg || error?.message || fallback;
};

const isGenericValidationError = (error, message) => {
  if (Number(error?.response?.status || 0) !== 422) return false;

  return ["validation error", "validation failed", "unprocessable entity"].includes(
    String(message || "").trim().toLowerCase(),
  );
};

const messageContainsAny = (message, tokens) => {
  const text = String(message || "")
    .trim()
    .toLowerCase();
  if (!text) return false;
  return tokens.some((token) => text.includes(token));
};

const isAlreadyEnabledError = (error) =>
  messageContainsAny(getApiError(error, ""), [
    "already enabled",
    "is enabled",
    "already active",
    "2fa enabled",
    "two-factor authentication is already enabled",
  ]);

const isAlreadyDisabledError = (error) =>
  messageContainsAny(getApiError(error, ""), [
    "already disabled",
    "is disabled",
    "not enabled",
    "2fa disabled",
    "two-factor authentication is already disabled",
  ]);

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const formatProfileDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const maskEmailAddress = (email) => {
  const value = String(email || "").trim();
  if (!value.includes("@")) return value || "N/A";

  const [localPartRaw, domainRaw] = value.split("@");
  const localPart = String(localPartRaw || "");
  const domain = String(domainRaw || "");
  if (!localPart || !domain) return value;

  const localMask =
    localPart.length <= 2
      ? `${localPart[0] || "*"}*`
      : `${localPart.slice(0, 1)}${"*".repeat(Math.max(localPart.length - 2, 1))}${localPart.slice(-1)}`;

  const domainPieces = domain.split(".");
  const domainName = domainPieces[0] || "";
  const tld = domainPieces.slice(1).join(".");
  const domainMask =
    domainName.length <= 2
      ? `${domainName[0] || "*"}*`
      : `${domainName.slice(0, 1)}${"*".repeat(Math.max(domainName.length - 2, 1))}${domainName.slice(-1)}`;

  return `${localMask}@${domainMask}${tld ? `.${tld}` : ""}`;
};

const SecuritySettings = () => {
  const { refreshUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [hasSecurityCode, setHasSecurityCode] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleQr, setGoogleQr] = useState("");
  const [googleSecret, setGoogleSecret] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
    verification_code: "",
  });
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordUiStep, setPasswordUiStep] = useState(1);
  const [passwordStepError, setPasswordStepError] = useState("");

  const [emailChangeForm, setEmailChangeForm] = useState({
    current_code: "",
    new_email: "",
    new_code: "",
  });
  const [emailChangeState, setEmailChangeState] = useState({
    currentCodeSent: false,
    currentVerified: false,
    newCodeSent: false,
  });

  const [phoneChangeForm, setPhoneChangeForm] = useState({
    code: "+92",
    phone: "",
    security_code: "",
    verification_code: "",
  });
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSecurityVisible, setPhoneSecurityVisible] = useState(false);
  const [phoneUiStep, setPhoneUiStep] = useState(1);
  const [phoneStepError, setPhoneStepError] = useState("");

  const [securityForm, setSecurityForm] = useState({
    current_code: "",
    new_code: "",
    confirm_code: "",
    forgot_verification_code: "",
    forgot_new_code: "",
    forgot_confirm_code: "",
  });
  const [showForgetSecurity, setShowForgetSecurity] = useState(false);
  const [forgetCodeSent, setForgetCodeSent] = useState(false);
  const [securityChangeStep, setSecurityChangeStep] = useState(1);
  const [securityStepError, setSecurityStepError] = useState("");
  const [showForgetGoogle, setShowForgetGoogle] = useState(false);
  const [googleForm, setGoogleForm] = useState({
    otp: "",
    password: "",
  });

  const [submittingAction, setSubmittingAction] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const clearFeedback = () => setFeedback({ type: "", message: "" });

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const result = await getProfileDetails();
      setProfileData(result?.user || result?.payload || null);
      if (typeof refreshUser === "function") {
        refreshUser().catch(() => undefined);
      }
    } catch (error) {
      setProfileError(getApiError(error, "Failed to load profile details."));
    } finally {
      setProfileLoading(false);
    }
  }, [refreshUser]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const result = await getSecurityCodeStatus();
      setHasSecurityCode(Boolean(result?.hasSecurityCode));
    } catch (error) {
      setStatusError(getApiError(error, "Failed to load security code status."));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadGoogleStatus = useCallback(async () => {
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const result = await getGoogleAuthStatus();
      setGoogleEnabled(Boolean(result?.enabled));
      setGoogleQr(String(result?.qrCode || ""));
      setGoogleSecret(String(result?.secret || ""));
    } catch (error) {
      setGoogleEnabled(false);
      setGoogleQr("");
      setGoogleSecret("");
      setGoogleError(
        getApiError(
          error,
          "Unable to load Google Auth status. Verify backend endpoints.",
        ),
      );
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadStatus();
    loadGoogleStatus();
  }, [loadGoogleStatus, loadProfile, loadStatus]);

  const statusLabel = useMemo(() => {
    if (statusLoading) return "Checking...";
    return hasSecurityCode ? "Configured" : "Not Configured";
  }, [hasSecurityCode, statusLoading]);

  const quickInfo = useMemo(
    () => [
      {
        label: "Account Email",
        value: profileData?.email || "N/A",
        tone: "neutral",
      },
      {
        label: "Security Code",
        value: statusLabel,
        tone: hasSecurityCode ? "success" : "warning",
      },
      {
        label: "Google Auth",
        value: googleLoading ? "Checking..." : googleEnabled ? "Enabled" : "Disabled",
        tone: googleEnabled ? "success" : "warning",
      },
      {
        label: "Current Section",
        value: TAB_ITEMS.find((tab) => tab.key === activeTab)?.title || "Profile",
        tone: "accent",
      },
    ],
    [activeTab, googleEnabled, googleLoading, hasSecurityCode, profileData?.email, statusLabel],
  );

  const maskedCurrentEmail = useMemo(
    () => maskEmailAddress(profileData?.email),
    [profileData?.email],
  );

  const profileRows = useMemo(
    () => [
      { label: "Name", value: profileData?.name || profileData?.full_name },
      { label: "Email", value: profileData?.email },
      { label: "Phone", value: profileData?.phone },
      {
        label: "User Code",
        value: profileData?.tevau_user?.user_code || profileData?.user_code,
      },
      {
        label: "Third ID",
        value: profileData?.tevau_user?.third_id || profileData?.third_id,
      },
      {
        label: "Role",
        value:
          profileData?.role?.name ||
          profileData?.role_name ||
          profileData?.role ||
          profileData?.role_key,
      },
      {
        label: "Member Since",
        value: formatProfileDate(profileData?.created_at),
      },
      {
        label: "Last Update",
        value: formatProfileDate(profileData?.updated_at),
      },
      {
        label: "Google Auth Enabled",
        value: googleLoading ? "Checking..." : googleEnabled,
      },
      {
        label: "Security Code",
        value: statusLoading ? "Checking..." : hasSecurityCode,
      },
    ],
    [googleEnabled, googleLoading, hasSecurityCode, profileData, statusLoading],
  );

  const onPasswordSendCode = async () => {
    clearFeedback();
    setSubmittingAction("password-send-code");
    try {
      await sendChangePasswordCode();
      setPasswordCodeSent(true);
      setFeedback({
        type: "success",
        message: "Verification code sent to your email.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to send password verification code."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onPasswordSubmit = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    clearFeedback();

    setSubmittingAction("password-confirm");
    try {
      await confirmChangePassword({
        newPassword: passwordForm.new_password,
        confirmPassword: passwordForm.confirm_password,
        verificationCode: passwordForm.verification_code,
      });
      setFeedback({ type: "success", message: "Password updated successfully." });
      setPasswordForm({ new_password: "", confirm_password: "", verification_code: "" });
      setPasswordCodeSent(false);
      setPasswordUiStep(1);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to confirm password change."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onSendEmailCurrentCode = async () => {
    clearFeedback();
    setSubmittingAction("email-send-current");
    try {
      await sendChangeEmailCodeCurrent();
      setEmailChangeState((prev) => ({
        ...prev,
        currentCodeSent: true,
      }));
      setFeedback({
        type: "success",
        message: "Code sent to your current email.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to send code on current email."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onVerifyEmailCurrent = async () => {
    clearFeedback();

    if (!String(emailChangeForm.current_code || "").trim()) {
      setFeedback({
        type: "error",
        message: "Current email verification code is required.",
      });
      return;
    }

    setSubmittingAction("email-verify-current");
    try {
      await verifyChangeEmailCurrent({
        verificationCode: emailChangeForm.current_code,
      });
      setEmailChangeState((prev) => ({
        ...prev,
        currentVerified: true,
      }));
      setFeedback({
        type: "success",
        message: "Current email verified. Enter new email now.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to verify current email code."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onSendEmailNewCode = async () => {
    clearFeedback();

    if (!emailChangeState.currentVerified) {
      setFeedback({
        type: "error",
        message: "First verify code sent on current email.",
      });
      return;
    }

    const newEmail = String(emailChangeForm.new_email || "").trim();

    if (!newEmail) {
      setFeedback({
        type: "error",
        message: "New email is required.",
      });
      return;
    }

    if (
      String(profileData?.email || "").trim().toLowerCase() === newEmail.toLowerCase()
    ) {
      setFeedback({
        type: "error",
        message: "New email must be different from your current email.",
      });
      return;
    }

    setSubmittingAction("email-send-new");
    try {
      await sendChangeEmailCodeNew({
        newEmail,
      });
      setEmailChangeState((prev) => ({
        ...prev,
        newCodeSent: true,
      }));
      setFeedback({
        type: "success",
        message: "Code sent to new email.",
      });
    } catch (error) {
      const message = getApiError(error, "Unable to send code on new email.");
      setFeedback({
        type: "error",
        message: isGenericValidationError(error, message)
          ? "This email address is already in use or cannot be used. Please enter a different email address."
          : message,
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onConfirmEmailChange = async () => {
    clearFeedback();

    if (!emailChangeState.currentVerified) {
      setFeedback({
        type: "error",
        message: "Current email verification is pending.",
      });
      return;
    }

    if (!String(emailChangeForm.new_email || "").trim()) {
      setFeedback({
        type: "error",
        message: "New email is required.",
      });
      return;
    }

    if (!String(emailChangeForm.new_code || "").trim()) {
      setFeedback({
        type: "error",
        message: "Verification code from new email is required.",
      });
      return;
    }

    setSubmittingAction("email-confirm");
    try {
      await confirmChangeEmail({
        newEmail: emailChangeForm.new_email,
        verificationCode: emailChangeForm.new_code,
      });
      setFeedback({
        type: "success",
        message: "Email changed successfully.",
      });
      setEmailChangeForm({
        current_code: "",
        new_email: "",
        new_code: "",
      });
      setEmailChangeState({
        currentCodeSent: false,
        currentVerified: false,
        newCodeSent: false,
      });
      await loadProfile();
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to confirm email change."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onPhoneSendCode = async () => {
    clearFeedback();

    if (!String(phoneChangeForm.code || "").trim() || !String(phoneChangeForm.phone || "").trim()) {
      setFeedback({
        type: "error",
        message: "Country code and phone are required.",
      });
      return;
    }

    if (hasSecurityCode && !String(phoneChangeForm.security_code || "").trim()) {
      setFeedback({
        type: "error",
        message: "Security code is required before phone verification.",
      });
      return;
    }

    setSubmittingAction("phone-send-code");
    try {
      if (hasSecurityCode) {
        await validateSecurityCode({
          securityCode: phoneChangeForm.security_code,
        });
      }
      await sendChangePhoneCode({
        countryCode: phoneChangeForm.code,
        phone: phoneChangeForm.phone,
      });
      setPhoneCodeSent(true);
      setFeedback({
        type: "success",
        message: "Verification code sent to new phone number.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to send phone verification code."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onPhoneConfirm = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (
      !String(phoneChangeForm.code || "").trim() ||
      !String(phoneChangeForm.phone || "").trim() ||
      !String(phoneChangeForm.verification_code || "").trim()
    ) {
      setFeedback({
        type: "error",
        message: "Country code, phone and verification code are required.",
      });
      return;
    }

    setSubmittingAction("phone-confirm");
    try {
      await confirmChangePhone({
        countryCode: phoneChangeForm.code,
        phone: phoneChangeForm.phone,
        verificationCode: phoneChangeForm.verification_code,
      });
      setFeedback({
        type: "success",
        message: "Phone number changed successfully.",
      });
      setPhoneChangeForm({
        code: phoneChangeForm.code || "+92",
        phone: "",
        security_code: "",
        verification_code: "",
      });
      setPhoneCodeSent(false);
      await loadProfile();
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to confirm phone change."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onSecuritySubmit = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    clearFeedback();
    setSubmittingAction("security-submit");
    try {
      if (hasSecurityCode) {
        await changeSecurityCode({
          currentCode: securityForm.current_code,
          newCode: securityForm.new_code,
          confirmCode: securityForm.confirm_code,
        });
      } else {
        await createSecurityCode({
          securityCode: securityForm.new_code,
          confirmCode: securityForm.confirm_code,
        });
      }

      setSecurityForm({
        current_code: "",
        new_code: "",
        confirm_code: "",
        forgot_verification_code: "",
        forgot_new_code: "",
        forgot_confirm_code: "",
      });
      setSecurityChangeStep(1);
      setSecurityStepError("");
      await loadStatus();
      setFeedback({
        type: "success",
        message: hasSecurityCode
          ? "Security code updated successfully."
          : "Security code created successfully.",
      });
    } catch (error) {
      setSecurityStepError(
        getApiError(
          error,
          hasSecurityCode
            ? "Unable to update security code."
            : "Unable to create security code.",
        ),
      );
    } finally {
      setSubmittingAction("");
    }
  };

  const onSendForgetCode = async () => {
    clearFeedback();
    setSubmittingAction("security-forget-send");
    try {
      await sendSecurityForgetCode();
      setForgetCodeSent(true);
      setFeedback({ type: "success", message: "Verification code sent to your email." });
    } catch (error) {
      const msg = getApiError(error, "");
      const codeWasSent =
        msg.includes("verification code") || msg.includes("sent") || msg.includes("email");
      if (codeWasSent) {
        setForgetCodeSent(true);
        setFeedback({ type: "success", message: "Verification code sent to your email." });
      } else {
        setFeedback({ type: "error", message: msg || "Unable to send verification code." });
      }
    } finally {
      setSubmittingAction("");
    }
  };

  const onSecurityForget = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!String(securityForm.forgot_verification_code || "").trim()) {
      setFeedback({ type: "error", message: "Verification code is required." });
      return;
    }
    if (!String(securityForm.forgot_new_code || "").trim()) {
      setFeedback({ type: "error", message: "New security code is required." });
      return;
    }
    if (!String(securityForm.forgot_confirm_code || "").trim()) {
      setFeedback({ type: "error", message: "Confirm new security code." });
      return;
    }

    setSubmittingAction("security-forget");

    try {
      await forgetSecurityCode({
        verificationCode: securityForm.forgot_verification_code,
        newCode: securityForm.forgot_new_code,
        confirmCode: securityForm.forgot_confirm_code,
      });
      setSecurityForm((prev) => ({
        ...prev,
        forgot_verification_code: "",
        forgot_new_code: "",
        forgot_confirm_code: "",
      }));
      setShowForgetSecurity(false);
      setForgetCodeSent(false);
      await loadStatus();
      setFeedback({
        type: "success",
        message: "Security code reset successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to reset security code."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onSetupGoogle = async ({ keepFeedback = false } = {}) => {
    if (!keepFeedback) {
      clearFeedback();
    }
    setSubmittingAction("google-setup");
    try {
      const response = await setupGoogleAuth();
      const payload =
        response?.data && typeof response.data === "object"
          ? response.data
          : response || {};

      setGoogleQr(
        payload?.qr_code || payload?.qrCode || payload?.qrcode || googleQr,
      );
      setGoogleSecret(
        payload?.secret || payload?.google_secret || payload?.manual_entry_key || googleSecret,
      );
      if (!keepFeedback) {
        setFeedback({
          type: "success",
          message: "2FA setup generated. Enter code to confirm enable.",
        });
      }
    } catch (error) {
      if (isAlreadyEnabledError(error)) {
        setGoogleEnabled(true);
        setGoogleQr("");
        setGoogleSecret("");
        await loadGoogleStatus();
        setFeedback({
          type: "success",
          message: "Google Auth already enabled hai. Status refreshed.",
        });
        return;
      }
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to setup Google Auth."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onCopyGoogleSecret = async () => {
    const key = String(googleSecret || "").trim();
    if (!key) {
      setFeedback({
        type: "error",
        message: "Secret key is not available.",
      });
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      setFeedback({
        type: "error",
        message: "Clipboard access is not available. Copy the secret key manually.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      setFeedback({
        type: "success",
        message: "Secret key copied. Paste it into the Google Authenticator app.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to copy the secret key."),
      });
    }
  };

  const onGooglePrimarySubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!googleEnabled && !googleQr && !googleSecret) {
      setFeedback({
        type: "error",
        message: "Generate the setup first, then confirm the code.",
      });
      return;
    }

    if (!String(googleForm.otp || "").trim()) {
      setFeedback({
        type: "error",
        message: googleEnabled
          ? "Authenticator code is required to disable 2FA."
          : "Authenticator code is required to enable 2FA.",
      });
      return;
    }

    const enabling = !googleEnabled;
    setSubmittingAction(googleEnabled ? "google-disable" : "google-verify");
    try {
      if (googleEnabled) {
        await disableGoogleAuth({ otp: googleForm.otp });
        setGoogleQr("");
        setGoogleSecret("");
      } else {
        await verifyGoogleAuth({ otp: googleForm.otp });
      }
      setGoogleForm((prev) => ({ ...prev, otp: "" }));
      await loadGoogleStatus();
      setFeedback({
        type: "success",
        message: googleEnabled
          ? "Google Auth disabled successfully."
          : "Google Auth enabled successfully.",
      });
    } catch (error) {
      if (enabling && isAlreadyEnabledError(error)) {
        setGoogleEnabled(true);
        setGoogleForm((prev) => ({ ...prev, otp: "" }));
        await loadGoogleStatus();
        setFeedback({
          type: "success",
          message: "Google Auth already enabled tha. Status refreshed.",
        });
        return;
      }
      if (!enabling && isAlreadyDisabledError(error)) {
        setGoogleEnabled(false);
        setGoogleQr("");
        setGoogleSecret("");
        setGoogleForm((prev) => ({ ...prev, otp: "" }));
        await loadGoogleStatus();
        setFeedback({
          type: "success",
          message: "Google Auth already disabled tha. Status refreshed.",
        });
        return;
      }
      setFeedback({
        type: "error",
        message: getApiError(
          error,
          googleEnabled
            ? "Unable to disable Google Auth."
            : "Unable to confirm Google Auth.",
        ),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onResetGoogleSetup = async () => {
    clearFeedback();
    if (!String(googleForm.otp || "").trim()) {
      setFeedback({
        type: "error",
        message: "Current authenticator code required for reset setup.",
      });
      return;
    }

    setSubmittingAction("google-reset-setup");
    try {
      await disableGoogleAuth({ otp: googleForm.otp });
      const response = await setupGoogleAuth();
      const payload =
        response?.data && typeof response.data === "object"
          ? response.data
          : response || {};

      setGoogleEnabled(false);
      setGoogleQr(
        payload?.qr_code || payload?.qrCode || payload?.qrcode || "",
      );
      setGoogleSecret(
        payload?.secret || payload?.google_secret || payload?.manual_entry_key || "",
      );
      setGoogleForm((prev) => ({ ...prev, otp: "" }));
      await loadGoogleStatus();
      setFeedback({
        type: "success",
        message: "2FA disabled and new setup generated. Confirm with new code.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to reset Google Auth setup."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onGoogleToggleSwitch = () => {
    if (googleEnabled) {
      setFeedback({
        type: "error",
        message: "Enter the code below and submit to disable 2FA.",
      });
      return;
    }
    onSetupGoogle();
  };

  const onForgetGoogle = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!String(googleForm.password || "").trim()) {
      setFeedback({ type: "error", message: "Account password is required." });
      return;
    }

    setSubmittingAction("google-forget");
    try {
      await forgetGoogleAuth({ password: googleForm.password });
      setGoogleEnabled(false);
      setGoogleQr("");
      setGoogleSecret("");
      setGoogleForm((prev) => ({ ...prev, otp: "", password: "" }));
      await loadGoogleStatus();
      setFeedback({
        type: "success",
        message: "2FA forget request successful.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to process 2FA forget request."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  return (
    <>
      <PageTitle motherMenu="Home" motherMenuPath="/" activeMenu="Profile & Settings" />

      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel nova-settings-shell">
            <div className="card-body">
              <div className="nova-settings-hero">
              <div className="nova-settings-hero-head">
                <div>
                  <h4 className="mb-0">Profile Settings</h4>
                </div>
                <div className="nova-sec-status-wrap">
                  <span
                    className={`nova-sec-status-chip ${
                      hasSecurityCode ? "is-success" : "is-warning"
                    }`}
                  >
                    Security: {statusLabel}
                  </span>
                  <span
                    className={`nova-sec-status-chip ${
                      googleEnabled ? "is-success" : "is-warning"
                    }`}
                  >
                    Google Auth: {googleLoading ? "Checking..." : googleEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      loadProfile();
                      loadStatus();
                      loadGoogleStatus();
                    }}
                    disabled={profileLoading || statusLoading || googleLoading}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="nova-settings-quick-grid">
                {quickInfo.map((item) => (
                  <div
                    key={item.label}
                    className={`nova-settings-quick-card ${
                      item.tone ? `is-${item.tone}` : ""
                    }`}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              </div>
              {(statusError || googleError || profileError) ? (
                <div className="nova-kyc-feedback is-error mt-3 mb-0">
                  <i className="fa fa-exclamation-circle" />
                  <span>{statusError || googleError || profileError}</span>
                </div>
              ) : null}

              <div className="row g-3 mt-0 nova-settings-shell-body">
                <div className="col-xl-3 col-12">
                  <div className="nova-settings-side-pane">
              <div className="nova-settings-nav-head">
                <h6>Settings Menu</h6>
              </div>
              <div className="nova-settings-nav">
                {TAB_ITEMS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`nova-settings-nav-btn ${
                      activeTab === tab.key ? "is-active" : ""
                    }`}
                    onClick={() => {
                      clearFeedback();
                      setActiveTab(tab.key);
                    }}
                  >
                    <span className="nova-settings-nav-icon">
                      <i className={tab.icon} />
                    </span>
                    <span className="nova-settings-nav-text">
                      <strong>{tab.title}</strong>
                    </span>
                    <i className="pi pi-angle-right nova-settings-nav-arrow" />
                  </button>
                ))}
              </div>
                  </div>
                </div>

                <div className="col-xl-9 col-12">
                  <div className="nova-settings-main-pane">
              {feedback.message ? (
                <div
                  className={`nova-kyc-feedback mb-3 ${
                    feedback.type === "error" ? "is-error" : "is-success"
                  }`}
                >
                  <i className={`fa ${feedback.type === "error" ? "fa-exclamation-circle" : "fa-check-circle"}`} />
                  <span>{feedback.message}</span>
                </div>
              ) : null}
              {activeTab === "profile" && (
                <div className="nova-settings-section nova-settings-panel">
                  <div className="nova-settings-section-head">
                    <h5 className="mb-0">Profile Details</h5>
                  </div>
                  {profileLoading ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <span className="spinner-border spinner-border-sm" />
                      Loading profile...
                    </div>
                  ) : (
                    <div className="row g-2">
                      {profileRows.map((row) => (
                        <div className="col-md-6" key={row.label}>
                          <div className="nova-settings-kv">
                            <span>{row.label}</span>
                            <strong>{formatValue(row.value)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "email" && (() => {
                const emailUiStep = !emailChangeState.currentVerified ? 1
                  : !emailChangeState.newCodeSent ? 2
                  : 3;
                const ESTEPS = [
                  { n: 1, label: "Verify Current Email" },
                  { n: 2, label: "Enter New Email" },
                  { n: 3, label: "Confirm Change" },
                ];
                return (
                  <div className="nova-email-stepper-wrap">
                    <div className="nova-email-stepper-head">
                      <h5 className="nova-email-stepper-title">Change Email</h5>
                      <p className="nova-email-stepper-sub">Update the email address linked to your account</p>
                    </div>

                    {/* Step indicator */}
                    <div className="nova-email-stepper-bar">
                      {ESTEPS.map(({ n, label }) => {
                        const done = n < emailUiStep;
                        const active = n === emailUiStep;
                        return (
                          <React.Fragment key={n}>
                            <div className={`nova-email-stepper-step ${done ? "is-done" : active ? "is-active" : ""}`}>
                              <div className="nova-email-stepper-circle">
                                {done ? <i className="pi pi-check" /> : n}
                              </div>
                              <span className="nova-email-stepper-label">{label}</span>
                            </div>
                            {n < 3 && <div className={`nova-email-stepper-connector ${done ? "is-done" : ""}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step 1 — Verify current email */}
                    {emailUiStep === 1 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <label>Your Current Email</label>
                          <div className="nova-bind-input is-static">{profileData?.email || "—"}</div>
                        </div>
                        <div className="nova-bind-field">
                          <label>Verification Code</label>
                          <div className="nova-bind-input-group">
                            <input
                              type="text"
                              className="nova-bind-input"
                              value={emailChangeForm.current_code}
                              onChange={(e) => setEmailChangeForm((prev) => ({ ...prev, current_code: e.target.value }))}
                              placeholder="Enter code sent to your email"
                            />
                            <button
                              type="button"
                              className="btn btn-primary nova-bind-inline-btn"
                              onClick={onSendEmailCurrentCode}
                              disabled={submittingAction === "email-send-current"}
                            >
                              {submittingAction === "email-send-current" ? "Sending..." : emailChangeState.currentCodeSent ? "Resend" : "Get Code"}
                            </button>
                          </div>
                          {emailChangeState.currentCodeSent && (
                            <p className="nova-email-stepper-hint"><i className="pi pi-info-circle me-1" />A code was sent to {profileData?.email}. Check your inbox.</p>
                          )}
                        </div>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={onVerifyEmailCurrent}
                            disabled={!emailChangeState.currentCodeSent || submittingAction === "email-verify-current"}
                          >
                            {submittingAction === "email-verify-current" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Verifying...</>
                            ) : (
                              <>Next <i className="pi pi-arrow-right ms-2" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2 — Enter new email */}
                    {emailUiStep === 2 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-verified-badge">
                          <i className="pi pi-check-circle me-2" />Current email verified
                        </div>
                        <div className="nova-bind-field">
                          <label>New Email Address</label>
                          <input
                            type="email"
                            className="nova-bind-input"
                            value={emailChangeForm.new_email}
                            onChange={(e) => {
                              setEmailChangeForm((prev) => ({ ...prev, new_email: e.target.value, new_code: "" }));
                              setEmailChangeState((prev) => ({ ...prev, newCodeSent: false }));
                            }}
                            placeholder="Enter your new email address"
                          />
                        </div>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => setEmailChangeState((prev) => ({ ...prev, currentVerified: false, currentCodeSent: false }))}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={onSendEmailNewCode}
                            disabled={!emailChangeForm.new_email.trim() || submittingAction === "email-send-new"}
                          >
                            {submittingAction === "email-send-new" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Sending Code...</>
                            ) : (
                              <>Send Code <i className="pi pi-send ms-2" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 — Enter code + confirm */}
                    {emailUiStep === 3 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-verified-badge">
                          <i className="pi pi-check-circle me-2" />Current email verified
                        </div>
                        <div className="nova-email-stepper-confirm-row">
                          <span className="nova-email-stepper-confirm-label">New Email</span>
                          <span className="nova-email-stepper-confirm-value">{emailChangeForm.new_email}</span>
                        </div>
                        <div className="nova-bind-field mt-3">
                          <label>Verification Code (New Email)</label>
                          <div className="nova-bind-input-group">
                            <input
                              type="text"
                              className="nova-bind-input"
                              value={emailChangeForm.new_code}
                              onChange={(e) => setEmailChangeForm((prev) => ({ ...prev, new_code: e.target.value }))}
                              placeholder="Enter code sent to your new email"
                            />
                            <button
                              type="button"
                              className="btn btn-primary nova-bind-inline-btn"
                              onClick={onSendEmailNewCode}
                              disabled={submittingAction === "email-send-new"}
                            >
                              {submittingAction === "email-send-new" ? "Sending..." : "Resend"}
                            </button>
                          </div>
                          <p className="nova-email-stepper-hint"><i className="pi pi-info-circle me-1" />A code was sent to {emailChangeForm.new_email}. Check your inbox.</p>
                        </div>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => setEmailChangeState((prev) => ({ ...prev, newCodeSent: false }))}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn is-confirm"
                            onClick={onConfirmEmailChange}
                            disabled={!emailChangeForm.new_code.trim() || submittingAction === "email-confirm"}
                          >
                            {submittingAction === "email-confirm" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Confirming...</>
                            ) : (
                              <><i className="pi pi-check me-2" />Confirm Change</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === "phone" && (() => {
                const activePhoneStep = phoneCodeSent ? 3
                  : (phoneUiStep >= 2 && !String(phoneChangeForm.phone || "").trim()) ? 1
                  : phoneUiStep;
                const PSTEPS = [
                  { n: 1, label: "Enter Phone Number" },
                  { n: 2, label: "Verify Security Code" },
                  { n: 3, label: "Enter Email Code" },
                ];
                return (
                  <div className="nova-email-stepper-wrap">
                    <div className="nova-email-stepper-head">
                      <h5 className="nova-email-stepper-title">Change Phone</h5>
                      <p className="nova-email-stepper-sub">Update the phone number linked to your account</p>
                    </div>

                    {/* Step indicator */}
                    <div className="nova-email-stepper-bar">
                      {PSTEPS.map(({ n, label }) => {
                        const done = n < activePhoneStep;
                        const active = n === activePhoneStep;
                        return (
                          <React.Fragment key={n}>
                            <div className={`nova-email-stepper-step ${done ? "is-done" : active ? "is-active" : ""}`}>
                              <div className="nova-email-stepper-circle">
                                {done ? <i className="pi pi-check" /> : n}
                              </div>
                              <span className="nova-email-stepper-label">{label}</span>
                            </div>
                            {n < 3 && <div className={`nova-email-stepper-connector ${done ? "is-done" : ""}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step 1 — Enter phone number */}
                    {activePhoneStep === 1 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <label>Phone Area Code</label>
                          <input
                            type="text"
                            className="nova-bind-input"
                            value={phoneChangeForm.code}
                            onChange={(e) => {
                              setPhoneChangeForm((prev) => ({ ...prev, code: e.target.value }));
                              setPhoneStepError("");
                              setPhoneCodeSent(false);
                            }}
                            placeholder="+92"
                          />
                        </div>
                        <div className="nova-bind-field">
                          <label>Phone Number</label>
                          <input
                            type="text"
                            className="nova-bind-input"
                            value={phoneChangeForm.phone}
                            onChange={(e) => {
                              setPhoneChangeForm((prev) => ({ ...prev, phone: e.target.value }));
                              setPhoneStepError("");
                              setPhoneCodeSent(false);
                            }}
                            placeholder="Enter your phone number"
                          />
                        </div>
                        {phoneStepError && (
                          <div className="nova-kyc-feedback is-error mt-2">
                            <i className="fa fa-exclamation-circle" /><span>{phoneStepError}</span>
                          </div>
                        )}
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={() => {
                              if (!String(phoneChangeForm.code || "").trim()) { setPhoneStepError("Phone area code is required."); return; }
                              if (!String(phoneChangeForm.phone || "").trim()) { setPhoneStepError("Phone number is required."); return; }
                              setPhoneStepError("");
                              setPhoneUiStep(2);
                            }}
                          >
                            Next <i className="pi pi-arrow-right ms-2" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2 — Security code + get verify code */}
                    {activePhoneStep === 2 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-confirm-row mb-3">
                          <span className="nova-email-stepper-confirm-label">Phone Number</span>
                          <span className="nova-email-stepper-confirm-value">{phoneChangeForm.code} {phoneChangeForm.phone}</span>
                        </div>
                        <div className="nova-bind-field">
                          <div className="nova-settings-inline-head">
                            <label>Security Code</label>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none nova-settings-link-action"
                              onClick={() => setActiveTab("security")}
                            >
                              Forgot?
                            </button>
                          </div>
                          <div className="nova-bind-password-wrap">
                            <input
                              type={phoneSecurityVisible ? "text" : "password"}
                              className="nova-bind-input"
                              value={phoneChangeForm.security_code}
                              onChange={(e) => { setPhoneChangeForm((prev) => ({ ...prev, security_code: e.target.value })); setPhoneStepError(""); }}
                              placeholder="Enter your security code"
                            />
                            <button
                              type="button"
                              className="nova-bind-eye-btn"
                              onClick={() => setPhoneSecurityVisible((prev) => !prev)}
                            >
                              <i className={`pi ${phoneSecurityVisible ? "pi-eye-slash" : "pi-eye"}`} />
                            </button>
                          </div>
                        </div>
                        {phoneStepError && (
                          <div className="nova-kyc-feedback is-error mt-2">
                            <i className="fa fa-exclamation-circle" /><span>{phoneStepError}</span>
                          </div>
                        )}
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => { setPhoneStepError(""); setPhoneUiStep(1); }}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={() => {
                              if (hasSecurityCode && !String(phoneChangeForm.security_code || "").trim()) {
                                setPhoneStepError("Security code is required.");
                                return;
                              }
                              setPhoneStepError("");
                              onPhoneSendCode();
                            }}
                            disabled={submittingAction === "phone-send-code"}
                          >
                            {submittingAction === "phone-send-code" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Sending...</>
                            ) : (
                              <>Send Verify Code <i className="pi pi-send ms-2" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 — Enter SMS code + confirm */}
                    {activePhoneStep === 3 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-verified-badge">
                          <i className="pi pi-check-circle me-2" />Verification code sent to your email
                        </div>
                        <div className="nova-bind-field mt-3">
                          <label>Verification Code</label>
                          <div className="nova-bind-input-group">
                            <input
                              type="text"
                              className="nova-bind-input"
                              value={phoneChangeForm.verification_code}
                              onChange={(e) => setPhoneChangeForm((prev) => ({ ...prev, verification_code: e.target.value }))}
                              placeholder="Enter code sent to your phone"
                            />
                            <button
                              type="button"
                              className="btn btn-primary nova-bind-inline-btn"
                              onClick={onPhoneSendCode}
                              disabled={submittingAction === "phone-send-code"}
                            >
                              {submittingAction === "phone-send-code" ? "Sending..." : "Resend"}
                            </button>
                          </div>
                          <p className="nova-email-stepper-hint"><i className="pi pi-info-circle me-1" />A verification code was sent to your email. Check your inbox.</p>
                        </div>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => { setPhoneCodeSent(false); setPhoneStepError(""); setPhoneUiStep(2); }}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn is-confirm"
                            onClick={onPhoneConfirm}
                            disabled={!String(phoneChangeForm.verification_code || "").trim() || submittingAction === "phone-confirm"}
                          >
                            {submittingAction === "phone-confirm" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Confirming...</>
                            ) : (
                              <><i className="pi pi-check me-2" />Confirm Phone</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

              {activeTab === "password" && (() => {
                const activePwStep = passwordCodeSent ? 3 : passwordUiStep;
                const PWSTEPS = [
                  { n: 1, label: "New Password" },
                  { n: 2, label: "Send Email Code" },
                  { n: 3, label: "Confirm Change" },
                ];
                return (
                  <div className="nova-email-stepper-wrap">
                    <div className="nova-email-stepper-head">
                      <h5 className="nova-email-stepper-title">Change Password</h5>
                      <p className="nova-email-stepper-sub">Set a new password for your account</p>
                    </div>

                    {/* Step indicator */}
                    <div className="nova-email-stepper-bar">
                      {PWSTEPS.map(({ n, label }) => {
                        const done = n < activePwStep;
                        const active = n === activePwStep;
                        return (
                          <React.Fragment key={n}>
                            <div className={`nova-email-stepper-step ${done ? "is-done" : active ? "is-active" : ""}`}>
                              <div className="nova-email-stepper-circle">
                                {done ? <i className="pi pi-check" /> : n}
                              </div>
                              <span className="nova-email-stepper-label">{label}</span>
                            </div>
                            {n < 3 && <div className={`nova-email-stepper-connector ${done ? "is-done" : ""}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step 1 — Enter new password */}
                    {activePwStep === 1 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <label>New Password</label>
                          <input
                            type="password"
                            className="nova-bind-input"
                            value={passwordForm.new_password}
                            onChange={(e) => { setPasswordForm((prev) => ({ ...prev, new_password: e.target.value })); setPasswordStepError(""); }}
                            placeholder="Enter new password"
                          />
                        </div>
                        <div className="nova-bind-field">
                          <label>Confirm Password</label>
                          <input
                            type="password"
                            className="nova-bind-input"
                            value={passwordForm.confirm_password}
                            onChange={(e) => { setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value })); setPasswordStepError(""); }}
                            placeholder="Re-enter new password"
                          />
                        </div>
                        {passwordStepError && (
                          <div className="nova-kyc-feedback is-error mt-2">
                            <i className="fa fa-exclamation-circle" /><span>{passwordStepError}</span>
                          </div>
                        )}
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={() => {
                              if (!passwordForm.new_password.trim()) { setPasswordStepError("New password is required."); return; }
                              if (!passwordForm.confirm_password.trim()) { setPasswordStepError("Please confirm your password."); return; }
                              if (passwordForm.new_password.trim() !== passwordForm.confirm_password.trim()) { setPasswordStepError("Passwords do not match."); return; }
                              setPasswordStepError("");
                              setPasswordUiStep(2);
                            }}
                          >
                            Next <i className="pi pi-arrow-right ms-2" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2 — Send email code */}
                    {activePwStep === 2 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-confirm-row mb-3">
                          <span className="nova-email-stepper-confirm-label">Account Email</span>
                          <span className="nova-email-stepper-confirm-value">{profileData?.email || "your email"}</span>
                        </div>
                        <p className="nova-email-stepper-hint mb-3">
                          <i className="pi pi-info-circle me-1" />A verification code will be sent to your email. Enter it in the next step to confirm the password change.
                        </p>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => { setPasswordStepError(""); setPasswordUiStep(1); }}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn"
                            onClick={onPasswordSendCode}
                            disabled={submittingAction === "password-send-code"}
                          >
                            {submittingAction === "password-send-code" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Sending...</>
                            ) : (
                              <>Send Code <i className="pi pi-send ms-2" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 — Enter code + confirm */}
                    {activePwStep === 3 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-verified-badge">
                          <i className="pi pi-check-circle me-2" />Verification code sent to your email
                        </div>
                        <div className="nova-bind-field mt-3">
                          <label>Verification Code</label>
                          <div className="nova-bind-input-group">
                            <input
                              type="text"
                              className="nova-bind-input"
                              value={passwordForm.verification_code}
                              onChange={(e) => setPasswordForm((prev) => ({ ...prev, verification_code: e.target.value }))}
                              placeholder="Enter code from your email"
                            />
                            <button
                              type="button"
                              className="btn btn-primary nova-bind-inline-btn"
                              onClick={onPasswordSendCode}
                              disabled={submittingAction === "password-send-code"}
                            >
                              {submittingAction === "password-send-code" ? "Sending..." : "Resend"}
                            </button>
                          </div>
                          <p className="nova-email-stepper-hint"><i className="pi pi-info-circle me-1" />Check your inbox for the verification code.</p>
                        </div>
                        <div className="nova-email-stepper-actions">
                          <button
                            type="button"
                            className="nova-email-stepper-back-btn"
                            onClick={() => { setPasswordCodeSent(false); setPasswordUiStep(2); }}
                          >
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button
                            type="button"
                            className="nova-email-stepper-next-btn is-confirm"
                            onClick={() => {
                              if (!passwordForm.new_password.trim() || !passwordForm.confirm_password.trim()) {
                                setPasswordCodeSent(false);
                                setPasswordUiStep(1);
                                setPasswordStepError("Please enter and confirm your new password.");
                                return;
                              }
                              onPasswordSubmit();
                            }}
                            disabled={!passwordForm.verification_code.trim() || submittingAction === "password-confirm"}
                          >
                            {submittingAction === "password-confirm" ? (
                              <><span className="spinner-border spinner-border-sm me-2" />Confirming...</>
                            ) : (
                              <><i className="pi pi-check me-2" />Confirm Change</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === "security" && (() => {
                /* ── Forgot/Reset flow ── */
                if (hasSecurityCode && showForgetSecurity) {
                  const forgotStep = forgetCodeSent ? 2 : 1;
                  const FSTEPS = [{ n: 1, label: "Send Email Code" }, { n: 2, label: "Reset Code" }];
                  return (
                    <div className="nova-email-stepper-wrap">
                      <div className="nova-email-stepper-head">
                        <h5 className="nova-email-stepper-title">Reset Security Code</h5>
                        <p className="nova-email-stepper-sub">Verify your email to reset your security code</p>
                      </div>
                      <div className="nova-email-stepper-bar">
                        {FSTEPS.map(({ n, label }) => {
                          const done = n < forgotStep;
                          const active = n === forgotStep;
                          return (
                            <React.Fragment key={n}>
                              <div className={`nova-email-stepper-step ${done ? "is-done" : active ? "is-active" : ""}`}>
                                <div className="nova-email-stepper-circle">{done ? <i className="pi pi-check" /> : n}</div>
                                <span className="nova-email-stepper-label">{label}</span>
                              </div>
                              {n < 2 && <div className={`nova-email-stepper-connector ${done ? "is-done" : ""}`} />}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {forgotStep === 1 && (
                        <div className="nova-email-stepper-panel">
                          <div className="nova-email-stepper-confirm-row mb-3">
                            <span className="nova-email-stepper-confirm-label">Account Email</span>
                            <span className="nova-email-stepper-confirm-value">{profileData?.email || "your email"}</span>
                          </div>
                          <p className="nova-email-stepper-hint mb-3"><i className="pi pi-info-circle me-1" />A verification code will be sent to your email to reset your security code.</p>
                          <div className="nova-email-stepper-actions">
                            <button type="button" className="nova-email-stepper-back-btn"
                              onClick={() => { setShowForgetSecurity(false); clearFeedback(); }}>
                              <i className="pi pi-arrow-left me-2" />Back
                            </button>
                            <button type="button" className="nova-email-stepper-next-btn"
                              onClick={onSendForgetCode} disabled={submittingAction === "security-forget-send"}>
                              {submittingAction === "security-forget-send"
                                ? <><span className="spinner-border spinner-border-sm me-2" />Sending...</>
                                : <>Send Code <i className="pi pi-send ms-2" /></>}
                            </button>
                          </div>
                        </div>
                      )}

                      {forgotStep === 2 && (
                        <div className="nova-email-stepper-panel">
                          <div className="nova-email-stepper-verified-badge mb-3">
                            <i className="pi pi-check-circle me-2" />Verification code sent to your email
                          </div>
                          <div className="nova-bind-field">
                            <label>Verification Code</label>
                            <div className="nova-bind-input-group">
                              <input type="text" className="nova-bind-input"
                                value={securityForm.forgot_verification_code}
                                onChange={(e) => setSecurityForm((prev) => ({ ...prev, forgot_verification_code: e.target.value }))}
                                placeholder="Code from email" />
                              <button type="button" className="btn btn-primary nova-bind-inline-btn"
                                onClick={onSendForgetCode} disabled={submittingAction === "security-forget-send"}>
                                {submittingAction === "security-forget-send" ? "Sending..." : "Resend"}
                              </button>
                            </div>
                          </div>
                          <div className="nova-bind-field">
                            <label>New Security Code</label>
                            <input type="password" className="nova-bind-input"
                              value={securityForm.forgot_new_code}
                              onChange={(e) => setSecurityForm((prev) => ({ ...prev, forgot_new_code: e.target.value }))}
                              placeholder="Enter new security code" />
                          </div>
                          <div className="nova-bind-field">
                            <label>Confirm Security Code</label>
                            <input type="password" className="nova-bind-input"
                              value={securityForm.forgot_confirm_code}
                              onChange={(e) => setSecurityForm((prev) => ({ ...prev, forgot_confirm_code: e.target.value }))}
                              placeholder="Confirm new security code" />
                          </div>
                          <div className="nova-email-stepper-actions">
                            <button type="button" className="nova-email-stepper-back-btn"
                              onClick={() => { setForgetCodeSent(false); setSecurityForm((prev) => ({ ...prev, forgot_verification_code: "", forgot_new_code: "", forgot_confirm_code: "" })); clearFeedback(); }}>
                              <i className="pi pi-arrow-left me-2" />Back
                            </button>
                            <button type="button" className="nova-email-stepper-next-btn is-confirm"
                              onClick={onSecurityForget} disabled={submittingAction === "security-forget"}>
                              {submittingAction === "security-forget"
                                ? <><span className="spinner-border spinner-border-sm me-2" />Resetting...</>
                                : <><i className="pi pi-check me-2" />Reset Security Code</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                /* ── Create / Change flow ── */
                const isCreate = !hasSecurityCode;
                const CSTEPS = isCreate
                  ? [{ n: 1, label: "New Code" }, { n: 2, label: "Confirm & Create" }]
                  : [{ n: 1, label: "Current Code" }, { n: 2, label: "New Code" }, { n: 3, label: "Confirm" }];
                const totalSteps = CSTEPS.length;
                return (
                  <div className="nova-email-stepper-wrap">
                    <div className="nova-email-stepper-head">
                      <h5 className="nova-email-stepper-title">{isCreate ? "Create Security Code" : "Change Security Code"}</h5>
                      <p className="nova-email-stepper-sub">{isCreate ? "Set a 6-digit security code for your account" : "Update your account security code"}</p>
                    </div>
                    <div className="nova-email-stepper-bar">
                      {CSTEPS.map(({ n, label }) => {
                        const done = n < securityChangeStep;
                        const active = n === securityChangeStep;
                        return (
                          <React.Fragment key={n}>
                            <div className={`nova-email-stepper-step ${done ? "is-done" : active ? "is-active" : ""}`}>
                              <div className="nova-email-stepper-circle">{done ? <i className="pi pi-check" /> : n}</div>
                              <span className="nova-email-stepper-label">{label}</span>
                            </div>
                            {n < totalSteps && <div className={`nova-email-stepper-connector ${done ? "is-done" : ""}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Create flow — Step 1: new + confirm */}
                    {isCreate && securityChangeStep === 1 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <label>New Security Code</label>
                          <input type="password" className="nova-bind-input"
                            value={securityForm.new_code}
                            onChange={(e) => { setSecurityForm((prev) => ({ ...prev, new_code: e.target.value })); setSecurityStepError(""); }}
                            placeholder="Enter new security code" />
                        </div>
                        <div className="nova-bind-field">
                          <label>Confirm Security Code</label>
                          <input type="password" className="nova-bind-input"
                            value={securityForm.confirm_code}
                            onChange={(e) => { setSecurityForm((prev) => ({ ...prev, confirm_code: e.target.value })); setSecurityStepError(""); }}
                            placeholder="Confirm security code" />
                        </div>
                        {securityStepError && <div className="nova-kyc-feedback is-error mt-2"><i className="fa fa-exclamation-circle" /><span>{securityStepError}</span></div>}
                        <div className="nova-email-stepper-actions">
                          <button type="button" className="nova-email-stepper-next-btn"
                            onClick={() => {
                              if (!securityForm.new_code.trim()) { setSecurityStepError("Security code is required."); return; }
                              if (!securityForm.confirm_code.trim()) { setSecurityStepError("Please confirm your security code."); return; }
                              if (securityForm.new_code !== securityForm.confirm_code) { setSecurityStepError("Codes do not match."); return; }
                              setSecurityStepError(""); setSecurityChangeStep(2);
                            }}>
                            Next <i className="pi pi-arrow-right ms-2" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Create flow — Step 2: confirm summary + submit */}
                    {isCreate && securityChangeStep === 2 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-confirm-row mb-3">
                          <span className="nova-email-stepper-confirm-label">New Security Code</span>
                          <span className="nova-email-stepper-confirm-value">{"•".repeat(securityForm.new_code.length || 6)}</span>
                        </div>
                        <p className="nova-email-stepper-hint"><i className="pi pi-info-circle me-1" />Click Create to save your new security code.</p>
                        {securityStepError && <div className="nova-kyc-feedback is-error mt-2"><i className="fa fa-exclamation-circle" /><span>{securityStepError}</span></div>}
                        <div className="nova-email-stepper-actions">
                          <button type="button" className="nova-email-stepper-back-btn" onClick={() => setSecurityChangeStep(1)}>
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button type="button" className="nova-email-stepper-next-btn is-confirm"
                            onClick={onSecuritySubmit} disabled={submittingAction === "security-submit"}>
                            {submittingAction === "security-submit"
                              ? <><span className="spinner-border spinner-border-sm me-2" />Creating...</>
                              : <><i className="pi pi-check me-2" />Create Security Code</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Change flow — Step 1: current code */}
                    {!isCreate && securityChangeStep === 1 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <div className="nova-settings-inline-head">
                            <label>Current Security Code</label>
                            <button type="button" className="btn btn-link p-0 text-decoration-none nova-settings-link-action"
                              onClick={() => { setShowForgetSecurity(true); clearFeedback(); }}>
                              Forgot?
                            </button>
                          </div>
                          <input type="password" className="nova-bind-input"
                            value={securityForm.current_code}
                            onChange={(e) => { setSecurityForm((prev) => ({ ...prev, current_code: e.target.value })); setSecurityStepError(""); }}
                            placeholder="Enter current security code" />
                        </div>
                        {securityStepError && <div className="nova-kyc-feedback is-error mt-2"><i className="fa fa-exclamation-circle" /><span>{securityStepError}</span></div>}
                        <div className="nova-email-stepper-actions">
                          <button type="button" className="nova-email-stepper-next-btn"
                            disabled={submittingAction === "security-validate"}
                            onClick={async () => {
                              if (!securityForm.current_code.trim()) { setSecurityStepError("Current security code is required."); return; }
                              setSecurityStepError("");
                              setSubmittingAction("security-validate");
                              try {
                                await validateSecurityCode({ securityCode: securityForm.current_code });
                                setSecurityChangeStep(2);
                              } catch (error) {
                                setSecurityStepError(getApiError(error, "Incorrect security code. Please try again."));
                              } finally {
                                setSubmittingAction("");
                              }
                            }}>
                            {submittingAction === "security-validate"
                              ? <><span className="spinner-border spinner-border-sm me-2" />Verifying...</>
                              : <>Next <i className="pi pi-arrow-right ms-2" /></>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Change flow — Step 2: new + confirm */}
                    {!isCreate && securityChangeStep === 2 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-bind-field">
                          <label>New Security Code</label>
                          <input type="password" className="nova-bind-input"
                            value={securityForm.new_code}
                            onChange={(e) => { setSecurityForm((prev) => ({ ...prev, new_code: e.target.value })); setSecurityStepError(""); }}
                            placeholder="Enter new security code" />
                        </div>
                        <div className="nova-bind-field">
                          <label>Confirm Security Code</label>
                          <input type="password" className="nova-bind-input"
                            value={securityForm.confirm_code}
                            onChange={(e) => { setSecurityForm((prev) => ({ ...prev, confirm_code: e.target.value })); setSecurityStepError(""); }}
                            placeholder="Confirm new security code" />
                        </div>
                        {securityStepError && <div className="nova-kyc-feedback is-error mt-2"><i className="fa fa-exclamation-circle" /><span>{securityStepError}</span></div>}
                        <div className="nova-email-stepper-actions">
                          <button type="button" className="nova-email-stepper-back-btn" onClick={() => { setSecurityStepError(""); setSecurityChangeStep(1); }}>
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button type="button" className="nova-email-stepper-next-btn"
                            onClick={() => {
                              if (!securityForm.new_code.trim()) { setSecurityStepError("New security code is required."); return; }
                              if (!securityForm.confirm_code.trim()) { setSecurityStepError("Please confirm your security code."); return; }
                              if (securityForm.new_code !== securityForm.confirm_code) { setSecurityStepError("Codes do not match."); return; }
                              setSecurityStepError(""); setSecurityChangeStep(3);
                            }}>
                            Next <i className="pi pi-arrow-right ms-2" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Change flow — Step 3: confirm & submit */}
                    {!isCreate && securityChangeStep === 3 && (
                      <div className="nova-email-stepper-panel">
                        <div className="nova-email-stepper-confirm-row mb-2">
                          <span className="nova-email-stepper-confirm-label">New Security Code</span>
                          <span className="nova-email-stepper-confirm-value">{"•".repeat(securityForm.new_code.length || 6)}</span>
                        </div>
                        <p className="nova-email-stepper-hint mt-2"><i className="pi pi-info-circle me-1" />Click Update to apply your new security code.</p>
                        {securityStepError && <div className="nova-kyc-feedback is-error mt-2"><i className="fa fa-exclamation-circle" /><span>{securityStepError}</span></div>}
                        <div className="nova-email-stepper-actions">
                          <button type="button" className="nova-email-stepper-back-btn" onClick={() => { setSecurityStepError(""); setSecurityChangeStep(2); }}>
                            <i className="pi pi-arrow-left me-2" />Back
                          </button>
                          <button type="button" className="nova-email-stepper-next-btn is-confirm"
                            onClick={onSecuritySubmit} disabled={submittingAction === "security-submit"}>
                            {submittingAction === "security-submit"
                              ? <><span className="spinner-border spinner-border-sm me-2" />Updating...</>
                              : <><i className="pi pi-check me-2" />Update Security Code</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === "google" && (
                <div className="nova-google-wrap">
                  <div className="nova-email-stepper-head">
                    <h5 className="nova-email-stepper-title">Google Authentication (2FA)</h5>
                    <p className="nova-email-stepper-sub">Protect your account with two-factor authentication</p>
                  </div>

                  {/* Status toggle */}
                  <div className="nova-google-status-card">
                    <div className="nova-google-status-info">
                      <div className={`nova-google-status-dot ${googleEnabled ? "is-on" : ""}`} />
                      <div>
                        <div className="nova-google-status-name">Google Authenticator</div>
                        <div className="nova-google-status-state">
                          {googleLoading ? "Checking status..." : googleEnabled ? "Two-factor authentication is enabled" : "Two-factor authentication is disabled"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`nova-2fa-switch ${googleEnabled ? "is-on" : ""}`}
                      onClick={onGoogleToggleSwitch}
                      disabled={googleLoading || submittingAction === "google-setup"}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Notice */}
                  <div className="nova-google-notice">
                    <i className="pi pi-shield nova-google-notice-icon" />
                    <p>2FA verification will be required for critical actions such as <strong>login, card purchase/top-up, CVV/PAN view, withdrawal, and transfer</strong>.</p>
                  </div>

                  {/* How-to steps — only when disabled */}
                  {!googleEnabled && (
                    <div className="nova-google-howto">
                      <div className="nova-google-howto-step">
                        <div className="nova-google-howto-num">1</div>
                        <div className="nova-google-howto-text">Click <strong>Generate Setup</strong> below to get your QR code and secret key.</div>
                      </div>
                      <div className="nova-google-howto-step">
                        <div className="nova-google-howto-num">2</div>
                        <div className="nova-google-howto-text">Open <strong>Google Authenticator</strong> and scan the QR code, or tap <strong>Enter a setup key</strong> to add manually.</div>
                      </div>
                      <div className="nova-google-howto-step">
                        <div className="nova-google-howto-num">3</div>
                        <div className="nova-google-howto-text">Enter the <strong>6-digit code</strong> from the app below and click <strong>Confirm & Enable</strong>.</div>
                      </div>
                    </div>
                  )}

                  {/* QR + Secret */}
                  {(googleQr || googleSecret) && (
                    <div className="nova-google-setup-panel">
                      {googleQr && (
                        <div className="nova-google-qr-card">
                          <img src={googleQr} alt="Google Auth QR" />
                          <p>Scan with Google Authenticator</p>
                        </div>
                      )}
                      {googleSecret && (
                        <div className="nova-google-secret-card">
                          <div className="nova-google-secret-label">Manual Setup Key</div>
                          <div className="nova-google-secret-value">
                            <code>{googleSecret}</code>
                            <button type="button" className="nova-google-copy-btn" onClick={onCopyGoogleSecret}>
                              <i className="pi pi-copy me-1" />Copy
                            </button>
                          </div>
                          <p className="nova-google-secret-hint">In Google Authenticator, tap <strong>Enter a setup key</strong> and paste this key.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Code input + submit */}
                  <form onSubmit={onGooglePrimarySubmit} className="nova-google-code-form">
                    <div className="nova-bind-field">
                      <label>{googleEnabled ? "Enter code to disable 2FA" : "Authenticator Code"}</label>
                      <div className="nova-bind-input-group">
                        <input
                          type="text"
                          className="nova-bind-input"
                          value={googleForm.otp}
                          onChange={(e) => setGoogleForm((prev) => ({ ...prev, otp: e.target.value }))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                        />
                        <button
                          type="submit"
                          className={`nova-email-stepper-next-btn ${googleEnabled ? "is-danger" : "is-confirm"}`}
                          disabled={submittingAction === "google-verify" || submittingAction === "google-disable"}
                        >
                          {submittingAction === "google-verify" ? (
                            <><span className="spinner-border spinner-border-sm me-2" />Confirming...</>
                          ) : submittingAction === "google-disable" ? (
                            <><span className="spinner-border spinner-border-sm me-2" />Disabling...</>
                          ) : googleEnabled ? (
                            <><i className="pi pi-times me-2" />Disable 2FA</>
                          ) : (
                            <><i className="pi pi-check me-2" />Confirm & Enable</>
                          )}
                        </button>
                      </div>
                      <p className="nova-email-stepper-hint mt-1"><i className="pi pi-info-circle me-1" />The code comes from the Google Authenticator app after scanning the QR code or adding the secret key.</p>
                    </div>
                  </form>

                  {/* Footer actions */}
                  <div className="nova-google-footer">
                    <button
                      type="button"
                      className="nova-google-footer-btn"
                      onClick={() => onSetupGoogle()}
                      disabled={submittingAction === "google-setup"}
                    >
                      {submittingAction === "google-setup" ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Generating...</>
                      ) : (
                        <><i className="pi pi-refresh me-2" />{googleQr || googleSecret ? "Regenerate Setup" : "Generate Setup"}</>
                      )}
                    </button>
                    {googleEnabled && (
                      <button
                        type="button"
                        className="nova-google-footer-btn"
                        onClick={onResetGoogleSetup}
                        disabled={submittingAction === "google-reset-setup"}
                      >
                        {submittingAction === "google-reset-setup" ? (
                          <><span className="spinner-border spinner-border-sm me-2" />Resetting...</>
                        ) : (
                          <><i className="pi pi-replay me-2" />Disable & New Setup</>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="nova-google-footer-btn is-danger"
                      onClick={() => setShowForgetGoogle((prev) => !prev)}
                    >
                      <i className={`pi ${showForgetGoogle ? "pi-times" : "pi-trash"} me-2`} />
                      {showForgetGoogle ? "Cancel" : "Forget 2FA"}
                    </button>
                  </div>

                  {/* Forget 2FA form */}
                  {showForgetGoogle && (
                    <div className="nova-google-forget-panel">
                      <div className="nova-google-forget-title"><i className="pi pi-exclamation-triangle me-2" />Reset 2FA Access</div>
                      <p className="nova-email-stepper-hint mb-3">Enter your account password to disable Google Authentication.</p>
                      <form onSubmit={onForgetGoogle}>
                        <div className="nova-bind-field">
                          <label>Account Password</label>
                          <div className="nova-bind-input-group">
                            <input
                              type="password"
                              className="nova-bind-input"
                              value={googleForm.password}
                              onChange={(e) => setGoogleForm((prev) => ({ ...prev, password: e.target.value }))}
                              placeholder="Enter your account password"
                            />
                            <button
                              type="submit"
                              className="nova-email-stepper-next-btn is-danger"
                              disabled={submittingAction === "google-forget"}
                            >
                              {submittingAction === "google-forget" ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
                              ) : (
                                <><i className="pi pi-check me-2" />Submit</>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SecuritySettings;
