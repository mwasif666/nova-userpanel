import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { AuthContext } from "../../../context/authContext";
import {
  changeSecurityCode,
  createSecurityCode,
  forgetSecurityCode,
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

const getApiError = (error, fallback) => {
  const payload = error?.response?.data || {};
  const errors = payload?.errors;

  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return String(first);
  }

  return payload?.message || payload?.msg || error?.message || fallback;
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

  const [securityForm, setSecurityForm] = useState({
    current_code: "",
    new_code: "",
    confirm_code: "",
    forgot_password: "",
  });
  const [showForgetSecurity, setShowForgetSecurity] = useState(false);
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
        value: profileData?.created_at,
      },
      {
        label: "Last Update",
        value: profileData?.updated_at,
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
      setFeedback({
        type: "success",
        message: "Verification code sent for password change.",
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
    event.preventDefault();
    clearFeedback();

    if (
      !passwordForm.new_password ||
      !passwordForm.confirm_password ||
      !passwordForm.verification_code
    ) {
      setFeedback({
        type: "error",
        message: "New password, confirm password, and verification code are required.",
      });
      return;
    }

    if (
      String(passwordForm.new_password || "").trim() !==
      String(passwordForm.confirm_password || "").trim()
    ) {
      setFeedback({
        type: "error",
        message: "New password and confirmation must match.",
      });
      return;
    }

    setSubmittingAction("password-confirm");
    try {
      await confirmChangePassword({
        newPassword: passwordForm.new_password,
        confirmPassword: passwordForm.confirm_password,
        verificationCode: passwordForm.verification_code,
      });
      setFeedback({ type: "success", message: "Password updated successfully." });
      setPasswordForm({
        new_password: "",
        confirm_password: "",
        verification_code: "",
      });
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

    if (!String(emailChangeForm.new_email || "").trim()) {
      setFeedback({
        type: "error",
        message: "New email is required.",
      });
      return;
    }

    setSubmittingAction("email-send-new");
    try {
      await sendChangeEmailCodeNew({
        newEmail: emailChangeForm.new_email,
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
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to send code on new email."),
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
    event.preventDefault();
    clearFeedback();

    if (!securityForm.new_code || !securityForm.confirm_code) {
      setFeedback({
        type: "error",
        message: "New security code and confirmation are required.",
      });
      return;
    }

    if (hasSecurityCode && !securityForm.current_code) {
      setFeedback({
        type: "error",
        message: "Current security code is required.",
      });
      return;
    }

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

      setSecurityForm((prev) => ({
        ...prev,
        current_code: "",
        new_code: "",
        confirm_code: "",
      }));
      await loadStatus();
      setFeedback({
        type: "success",
        message: hasSecurityCode
          ? "Security code updated successfully."
          : "Security code created successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(
          error,
          hasSecurityCode
            ? "Unable to update security code."
            : "Unable to create security code.",
        ),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const onSecurityForget = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!String(securityForm.forgot_password || "").trim()) {
      setFeedback({ type: "error", message: "Account password is required." });
      return;
    }

    setSubmittingAction("security-forget");

    try {
      await forgetSecurityCode({
        password: securityForm.forgot_password,
      });
      setSecurityForm((prev) => ({
        ...prev,
        current_code: "",
        new_code: "",
        confirm_code: "",
        forgot_password: "",
      }));
      setShowForgetSecurity(false);
      await loadStatus();
      setFeedback({
        type: "success",
        message:
          "Security code reset successful. Set a new security code now.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Unable to process forget security code."),
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
        message: "Secret key available nahi hai.",
      });
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      setFeedback({
        type: "error",
        message: "Clipboard access available nahi hai. Secret key manually copy karein.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      setFeedback({
        type: "success",
        message: "Secret key copied. Google Authenticator app mein paste karein.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiError(error, "Secret key copy nahi ho saki."),
      });
    }
  };

  const onGooglePrimarySubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!googleEnabled && !googleQr && !googleSecret) {
      setFeedback({
        type: "error",
        message: "Pehle setup generate karein, phir code confirm karein.",
      });
      return;
    }

    if (!String(googleForm.otp || "").trim()) {
      setFeedback({
        type: "error",
        message: googleEnabled
          ? "Disable ke liye authenticator code required hai."
          : "Enable confirm ke liye authenticator code required hai.",
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
        message: "Disable karne ke liye niche code enter karke submit karein.",
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
      <PageTitle motherMenu="Profile" activeMenu="Profile & Settings" />

      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel nova-settings-shell">
            <div className="card-body">
              <div className="nova-settings-hero">
              <div className="nova-settings-hero-head">
                <div>
                  <h4 className="mb-1">Profile Settings</h4>
                  <p className="mb-0 text-muted">
                    Manage profile details, password, security code and Google Auth in one place.
                  </p>
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
              {statusError ? <div className="alert alert-warning mt-3 mb-0">{statusError}</div> : null}
              {googleError ? <div className="alert alert-warning mt-3 mb-0">{googleError}</div> : null}
              {profileError ? <div className="alert alert-warning mt-3 mb-0">{profileError}</div> : null}

              <div className="row g-3 mt-0 nova-settings-shell-body">
                <div className="col-xl-3 col-12">
                  <div className="nova-settings-side-pane">
              <div className="nova-settings-nav-head">
                <h6>Settings Menu</h6>
                <p>Choose a section to update your account.</p>
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
                      <span>{tab.sub}</span>
                    </span>
                    <i className="pi pi-angle-right nova-settings-nav-arrow" />
                  </button>
                ))}
              </div>
                  </div>
                </div>

                <div className="col-xl-9 col-12">
                  <div className="nova-settings-main-pane">
              {activeTab === "profile" && (
                <div>
                  <h5 className="mb-3">Profile Details (API: `GET /me`)</h5>
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

              {activeTab === "email" && (
                <div className="nova-bind-tab-wrap">
                  <div className="nova-bind-card">
                    <h6 className="nova-bind-card-title">Bind Your Email</h6>
                    <p className="nova-bind-card-subtitle">
                      Verify current email first, then confirm new email.
                    </p>

                    <div className="nova-bind-field">
                      <label>Verification Method</label>
                      <div className="nova-bind-input is-static">
                        {maskedCurrentEmail}
                      </div>
                    </div>

                    <div className="nova-bind-field">
                      <label>Verification Code (Current Email)</label>
                      <div className="nova-bind-input-group">
                        <input
                          type="text"
                          className="nova-bind-input"
                          value={emailChangeForm.current_code}
                          onChange={(event) =>
                            setEmailChangeForm((prev) => ({
                              ...prev,
                              current_code: event.target.value,
                            }))
                          }
                          placeholder="Enter code"
                        />
                        <button
                          type="button"
                          className="btn btn-primary nova-bind-inline-btn"
                          onClick={onSendEmailCurrentCode}
                          disabled={submittingAction === "email-send-current"}
                        >
                          {submittingAction === "email-send-current" ? "Sending..." : "Get Code"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary nova-bind-main-btn"
                      onClick={onVerifyEmailCurrent}
                      disabled={
                        !emailChangeState.currentCodeSent ||
                        submittingAction === "email-verify-current"
                      }
                    >
                      {submittingAction === "email-verify-current" ? "Verifying..." : "Next"}
                    </button>

                    <div className="nova-bind-divider" />

                    <div className="nova-bind-field">
                      <label>New Email</label>
                      <input
                        type="email"
                        className="nova-bind-input"
                        value={emailChangeForm.new_email}
                        onChange={(event) => {
                          const nextEmail = event.target.value;
                          setEmailChangeForm((prev) => ({
                            ...prev,
                            new_email: nextEmail,
                            new_code: "",
                          }));
                          setEmailChangeState((prev) => ({
                            ...prev,
                            newCodeSent: false,
                          }));
                        }}
                        placeholder="Please enter"
                      />
                    </div>

                    <div className="nova-bind-field">
                      <label>Verification Code (New Email)</label>
                      <div className="nova-bind-input-group">
                        <input
                          type="text"
                          className="nova-bind-input"
                          value={emailChangeForm.new_code}
                          onChange={(event) =>
                            setEmailChangeForm((prev) => ({
                              ...prev,
                              new_code: event.target.value,
                            }))
                          }
                          placeholder="Enter code"
                        />
                        <button
                          type="button"
                          className="btn btn-primary nova-bind-inline-btn"
                          onClick={onSendEmailNewCode}
                          disabled={
                            !emailChangeState.currentVerified ||
                            submittingAction === "email-send-new"
                          }
                        >
                          {submittingAction === "email-send-new" ? "Sending..." : "Get Code"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary nova-bind-main-btn"
                      onClick={onConfirmEmailChange}
                      disabled={
                        !emailChangeState.newCodeSent ||
                        submittingAction === "email-confirm"
                      }
                    >
                      {submittingAction === "email-confirm" ? "Confirming..." : "Confirm Email"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "phone" && (
                <div className="nova-bind-tab-wrap">
                  <div className="nova-bind-card">
                    <h6 className="nova-bind-card-title">Bind Your Phone</h6>
                    <p className="nova-bind-card-subtitle">
                      Your card will be linked to your phone number.
                    </p>
                    <p className="text-muted small mb-3">
                      Verification code: {phoneCodeSent ? "Sent" : "Pending"}
                    </p>

                    <form onSubmit={onPhoneConfirm}>
                      <div className="nova-bind-field">
                        <label>Phone Area Code</label>
                        <input
                          type="text"
                          className="nova-bind-input"
                          value={phoneChangeForm.code}
                          onChange={(event) => {
                            setPhoneChangeForm((prev) => ({
                              ...prev,
                              code: event.target.value,
                            }));
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
                          onChange={(event) => {
                            setPhoneChangeForm((prev) => ({
                              ...prev,
                              phone: event.target.value,
                            }));
                            setPhoneCodeSent(false);
                          }}
                          placeholder="Please enter"
                        />
                      </div>

                      <div className="nova-bind-field">
                        <div className="d-flex align-items-center justify-content-between">
                          <label>Security Code</label>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none"
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
                            onChange={(event) =>
                              setPhoneChangeForm((prev) => ({
                                ...prev,
                                security_code: event.target.value,
                              }))
                            }
                            placeholder="Security code"
                          />
                          <button
                            type="button"
                            className="nova-bind-eye-btn"
                            onClick={() => setPhoneSecurityVisible((prev) => !prev)}
                            aria-label={phoneSecurityVisible ? "Hide security code" : "Show security code"}
                          >
                            <i className={`pi ${phoneSecurityVisible ? "pi-eye-slash" : "pi-eye"}`} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary nova-bind-main-btn"
                        onClick={onPhoneSendCode}
                        disabled={submittingAction === "phone-send-code"}
                      >
                        {submittingAction === "phone-send-code" ? "Sending..." : "Get Verify Code"}
                      </button>

                      <div className="nova-bind-field mb-0">
                        <label>Verification Code</label>
                        <input
                          type="text"
                          className="nova-bind-input"
                          value={phoneChangeForm.verification_code}
                          onChange={(event) =>
                            setPhoneChangeForm((prev) => ({
                              ...prev,
                              verification_code: event.target.value,
                            }))
                          }
                          placeholder="Enter code"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-outline-primary nova-bind-main-btn mt-3"
                        disabled={submittingAction === "phone-confirm"}
                      >
                        {submittingAction === "phone-confirm" ? "Confirming..." : "Confirm Phone"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "password" && (
                <div>
                  <h5 className="mb-3">Change Password</h5>
                  <p className="text-muted small mb-3">
                    First send verification code from `/app/change-password/send-code`,
                    then confirm new password with verification code.
                  </p>
                  <form onSubmit={onPasswordSubmit} className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={passwordForm.new_password}
                        onChange={(event) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            new_password: event.target.value,
                          }))
                        }
                        placeholder="New password"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Confirm Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={passwordForm.confirm_password}
                        onChange={(event) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            confirm_password: event.target.value,
                          }))
                        }
                        placeholder="Confirm password"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Verification Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={passwordForm.verification_code}
                        onChange={(event) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            verification_code: event.target.value,
                          }))
                        }
                        placeholder="Enter code"
                      />
                    </div>
                    <div className="col-12 d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={onPasswordSendCode}
                        disabled={submittingAction === "password-send-code"}
                      >
                        {submittingAction === "password-send-code"
                          ? "Sending..."
                          : "Send Verify Code"}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingAction === "password-confirm"}
                      >
                        {submittingAction === "password-confirm"
                          ? "Confirming..."
                          : "Confirm Password Change"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "security" && (
                <div className="row g-3">
                  <div className="col-12">
                    <h5 className="mb-0">Security Code</h5>
                    <p className="text-muted mb-0">
                      {hasSecurityCode
                        ? "Current security code change karein ya forgot flow use karein."
                        : "Naya security code setup karein."}
                    </p>
                  </div>

                  <div className="col-12">
                    <div className="nova-settings-section">
                      <h6 className="mb-3">
                        {hasSecurityCode ? "Change Security Code" : "Create Security Code"}
                      </h6>
                      <form onSubmit={onSecuritySubmit} className="row g-3">
                        {hasSecurityCode ? (
                          <div className="col-md-4">
                            <label className="form-label">Current Security Code</label>
                            <input
                              type="password"
                              className="form-control"
                              value={securityForm.current_code}
                              onChange={(event) =>
                                setSecurityForm((prev) => ({
                                  ...prev,
                                  current_code: event.target.value,
                                }))
                              }
                              placeholder="Current security code"
                            />
                          </div>
                        ) : null}

                        <div className={hasSecurityCode ? "col-md-4" : "col-md-6"}>
                          <label className="form-label">New Security Code</label>
                          <input
                            type="password"
                            className="form-control"
                            value={securityForm.new_code}
                            onChange={(event) =>
                              setSecurityForm((prev) => ({
                                ...prev,
                                new_code: event.target.value,
                              }))
                            }
                            placeholder="New security code"
                          />
                        </div>

                        <div className={hasSecurityCode ? "col-md-4" : "col-md-6"}>
                          <label className="form-label">Confirm New Security Code</label>
                          <input
                            type="password"
                            className="form-control"
                            value={securityForm.confirm_code}
                            onChange={(event) =>
                              setSecurityForm((prev) => ({
                                ...prev,
                                confirm_code: event.target.value,
                              }))
                            }
                            placeholder="Confirm new security code"
                          />
                        </div>

                        <div className="col-12 d-flex flex-wrap align-items-center justify-content-between gap-2">
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submittingAction === "security-submit"}
                          >
                            {submittingAction === "security-submit"
                              ? "Submitting..."
                              : hasSecurityCode
                                ? "Confirm"
                                : "Create Security Code"}
                          </button>

                          {hasSecurityCode ? (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none fw-semibold"
                              onClick={() => setShowForgetSecurity((prev) => !prev)}
                            >
                              {showForgetSecurity
                                ? "Cancel"
                                : "Forgot original security code?"}
                            </button>
                          ) : null}
                        </div>
                      </form>

                      {hasSecurityCode && showForgetSecurity ? (
                        <form onSubmit={onSecurityForget} className="row g-2 mt-2">
                          <div className="col-12">
                            <label className="form-label">Account Password</label>
                            <input
                              type="password"
                              className="form-control"
                              value={securityForm.forgot_password}
                              onChange={(event) =>
                                setSecurityForm((prev) => ({
                                  ...prev,
                                  forgot_password: event.target.value,
                                }))
                              }
                              placeholder="Enter account password"
                            />
                          </div>
                          <div className="col-12">
                            <button
                              type="submit"
                              className="btn btn-outline-danger"
                              disabled={submittingAction === "security-forget"}
                            >
                              {submittingAction === "security-forget"
                                ? "Processing..."
                                : "Reset via Forgot"}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "google" && (
                <div className="row g-3">
                  <div className="col-12">
                    <h5 className="mb-0">Google Authentication (2FA)</h5>
                    <p className="text-muted mb-0">
                      APIs: `/app/2fa/status`, `/app/2fa/setup`,
                      `/app/2fa/confirm`, `/app/2fa/disable`, `/app/2fa/forget`.
                    </p>
                  </div>

                  <div className="col-12">
                    <div className="nova-settings-section">
                      <div className="nova-2fa-switch-row">
                        <div>
                          <h6 className="mb-1">Google Authenticator (2FA)</h6>
                          <p className="text-muted small mb-0">
                            {googleLoading
                              ? "Checking status..."
                              : googleEnabled
                                ? "Currently enabled"
                                : "Currently disabled"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`nova-2fa-switch ${googleEnabled ? "is-on" : ""}`}
                          onClick={onGoogleToggleSwitch}
                          disabled={googleLoading || submittingAction === "google-setup"}
                          aria-label="Toggle Google 2FA setup"
                        >
                          <span />
                        </button>
                      </div>

                      <div className="nova-2fa-attention">
                        <strong>Attention</strong>
                        <p className="mb-0">
                          Login, card purchase/top-up, CVV/PAN view, withdrawal and transfer
                          jese critical actions par 2FA verification require hogi.
                        </p>
                      </div>

                      {!googleEnabled ? (
                        <div className="alert alert-info py-2 px-3 mt-3 mb-2">
                          <strong>Setup Flow</strong>
                          <p className="small mb-0 mt-1">
                            Step 1: Generate setup. Step 2: Google Authenticator app mein QR scan karein
                            ya <strong>Enter a setup key</strong> se secret key add karein. Step 3: App ka
                            6-digit code neeche enter karke <strong>Confirm &amp; Enable</strong> karein.
                          </p>
                        </div>
                      ) : null}

                      {(googleQr || googleSecret) && (
                        <div className="row g-2 mt-1">
                          {googleQr ? (
                            <div className="col-md-4">
                              <div className="small text-muted mb-1">QR Code</div>
                              <img
                                src={googleQr}
                                alt="Google Auth QR"
                                className="img-fluid rounded border"
                                style={{ maxHeight: "170px" }}
                              />
                            </div>
                          ) : null}
                          {googleSecret ? (
                            <div className="col-md-8">
                              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                                <div className="small text-muted">Secret Key</div>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={onCopyGoogleSecret}
                                >
                                  Copy Key
                                </button>
                              </div>
                              <p className="small text-muted mb-1">
                                Google Authenticator app mein <strong>Enter a setup key</strong> select
                                karke yeh secret key paste karein.
                              </p>
                              <code>{googleSecret}</code>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <form onSubmit={onGooglePrimarySubmit} className="row g-2 mt-2">
                        <div className="col-md-8">
                          <label className="form-label">Authenticator Code</label>
                          <input
                            type="text"
                            className="form-control"
                            value={googleForm.otp}
                            onChange={(event) =>
                              setGoogleForm((prev) => ({
                                ...prev,
                                otp: event.target.value,
                              }))
                            }
                            placeholder="Enter 6-digit code"
                          />
                          <div className="form-text">
                            Code Google Authenticator app se ayega after QR scan / secret key setup.
                          </div>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                          <button
                            type="submit"
                            className={`btn w-100 ${
                              googleEnabled ? "btn-outline-danger" : "btn-primary"
                            }`}
                            disabled={
                              submittingAction === "google-verify" ||
                              submittingAction === "google-disable"
                            }
                          >
                            {submittingAction === "google-verify"
                              ? "Confirming..."
                              : submittingAction === "google-disable"
                                ? "Disabling..."
                                : googleEnabled
                                  ? "Disable 2FA"
                                  : "Confirm & Enable"}
                          </button>
                        </div>
                      </form>

                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => onSetupGoogle()}
                            disabled={submittingAction === "google-setup"}
                        >
                          {submittingAction === "google-setup"
                            ? "Generating..."
                            : googleQr || googleSecret
                              ? "Regenerate Setup"
                              : "Generate New Setup"}
                        </button>

                        {googleEnabled ? (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={onResetGoogleSetup}
                            disabled={submittingAction === "google-reset-setup"}
                          >
                            {submittingAction === "google-reset-setup"
                              ? "Resetting..."
                              : "Disable & Setup New"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                          onClick={() => setShowForgetGoogle((prev) => !prev)}
                        >
                          {showForgetGoogle ? "Cancel Forget" : "Forget 2FA"}
                        </button>
                      </div>

                      {showForgetGoogle ? (
                        <form onSubmit={onForgetGoogle} className="row g-2 mt-3">
                          <div className="col-md-8">
                            <label className="form-label">Account Password</label>
                            <input
                              type="password"
                              className="form-control"
                              value={googleForm.password}
                              onChange={(event) =>
                                setGoogleForm((prev) => ({
                                  ...prev,
                                  password: event.target.value,
                                }))
                              }
                              placeholder="Enter account password"
                            />
                          </div>
                          <div className="col-md-4 d-flex align-items-end">
                            <button
                              type="submit"
                              className="btn btn-outline-warning w-100"
                              disabled={submittingAction === "google-forget"}
                            >
                              {submittingAction === "google-forget"
                                ? "Processing..."
                                : "Submit Forget"}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
                  </div>
                </div>
              </div>

              {feedback.message ? (
                <div
                  className={`alert ${
                    feedback.type === "error" ? "alert-danger" : "alert-success"
                  } mt-3 mb-0`}
                >
                  {feedback.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SecuritySettings;
