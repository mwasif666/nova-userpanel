import React, { useEffect, useMemo, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { request } from "../../../utils/api";
import useKycApprovalStatus from "../../hooks/useKycApprovalStatus";
const INITIAL_FORM_VALUES = {
  country_area: "US",
  first_name_en: "",
  last_name_en: "",
  birthday: "",
  identity_card_type: "1",
  identity_card: "",
  identity_card_validity_time: "",
  provider: "1",
};

const INITIAL_FILES = {
  identity_front_pic: null,
  identity_back_pic: null,
};

const IDENTITY_TYPE_LABELS = {
  1: "ID Card",
  2: "Passport",
  3: "Driving License",
};

const getStatusTone = (value) => {
  const status = String(value || "")
    .toLowerCase()
    .trim();
  if (["approved", "success", "verified", "passed"].includes(status))
    return "success";
  if (["rejected", "failed", "declined", "error"].includes(status))
    return "danger";
  if (["pending", "submitted", "processing", "review"].includes(status))
    return "warning";
  return "neutral";
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
};

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }
  return date.toISOString().slice(0, 10);
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getApiErrorMessage = (error) => {
  const payload = error?.response?.data || {};
  const validationErrors = payload?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const first = Object.values(validationErrors).flat().find(Boolean);
    if (first) return String(first);
  }

  return (
    payload?.message ||
    payload?.msg ||
    error?.message ||
    "Request failed. Please try again."
  );
};

const toFormValuesFromKyc = (record) => {
  if (!record) return null;

  return {
    country_area: String(
      record?.country_area || INITIAL_FORM_VALUES.country_area,
    ).toUpperCase(),
    first_name_en: record?.first_name_en || "",
    last_name_en: record?.last_name_en || "",
    birthday: toInputDate(record?.birthday),
    identity_card_type: String(
      record?.identity_card_type || INITIAL_FORM_VALUES.identity_card_type,
    ),
    identity_card: record?.identity_card || "",
    identity_card_validity_time: toInputDate(
      record?.identity_card_validity_time,
    ),
    provider: String(record?.provider || INITIAL_FORM_VALUES.provider),
  };
};

const mapIdentityTypeLabel = (value) => {
  const key = Number(value);
  return IDENTITY_TYPE_LABELS[key] || `Type ${value || "N/A"}`;
};

const mapLivenessStatus = (record) => {
  const auditStatus = record?.tevau_response?.liveness_result?.auditStatus;
  if (auditStatus === 1 || auditStatus === "1") return "Passed";
  if (auditStatus === 0 || auditStatus === "0") return "Failed";
  if (auditStatus === 2 || auditStatus === "2") return "Review";
  return "N/A";
};

const Kyc = () => {
  const {
    loading: kycLoading,
    error: kycError,
    kycRows: sortedKycRows,
    latestKyc,
    approvedKyc,
    displayKyc,
    isApproved,
    statusLabel,
    refresh: refreshKycStatus,
  } = useKycApprovalStatus();

  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [faceVerifyUrl, setFaceVerifyUrl] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const isResolvingInitialView = kycLoading && sortedKycRows.length === 0;

  const statusRaw = displayKyc?.status || "";
  const statusKey = String(statusRaw || "")
    .toLowerCase()
    .trim();
  const statusTone = getStatusTone(statusRaw);
  const isUnderReview = [
    "submitted",
    "pending",
    "processing",
    "review",
    "under_review",
  ].includes(statusKey);
  const hasFilledKyc = Boolean(displayKyc);
  const isFormDisabledByStatus = isUnderReview;

  useEffect(() => {
    refreshKycStatus().catch(() => undefined);
  }, [refreshKycStatus]);

  useEffect(() => {
    if (!displayKyc) return;

    const next = toFormValuesFromKyc(displayKyc);
    if (!next) return;

    setFormValues((prev) => ({
      ...prev,
      ...next,
    }));
  }, [displayKyc]);

  const handleRefreshKyc = async () => {
    setRefreshing(true);
    try {
      await refreshKycStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (field) => (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFiles((prev) => ({
      ...prev,
      [field]: selectedFile,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    if (!files.identity_front_pic) {
      setSubmitError("Front side image is required.");
      return;
    }

    if (formValues.identity_card_type === "1" && !files.identity_back_pic) {
      setSubmitError("Back side image is also required for ID Card type.");
      return;
    }

    const formData = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
      if (key === "security_code") return;
      formData.append(key, value ?? "");
    });

    if (files.identity_front_pic) {
      formData.append("identity_front_pic", files.identity_front_pic);
    }
    if (files.identity_back_pic) {
      formData.append("identity_back_pic", files.identity_back_pic);
    }

    setSubmitting(true);

    try {
      const response = await request({
        url: "app/tevau/kyc",
        method: "POST",
        data: formData,
      });

      const responseData = response?.data && typeof response.data === "object"
        ? response.data
        : response || {};

      const verifyUrl =
        response?.kyc_url ||
        responseData?.kyc_url ||
        responseData?.url ||
        responseData?.verify_url ||
        responseData?.face_url ||
        responseData?.liveness_url ||
        responseData?.verification_url ||
        responseData?.redirect_url ||
        response?.url ||
        "";

      setFaceVerifyUrl(String(verifyUrl || "").trim());
      setSubmitMessage("KYC submitted successfully.");

      setFiles(INITIAL_FILES);
      await refreshKycStatus();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    const fromExisting = toFormValuesFromKyc(displayKyc);
    setFormValues(fromExisting || INITIAL_FORM_VALUES);
    setFiles(INITIAL_FILES);
    setSubmitError("");
    setSubmitMessage("");
    setFaceVerifyUrl("");
  };

  const statusRows = [
    { label: "KYC Filled", value: hasFilledKyc ? "Yes" : "No" },
    { label: "Approved", value: isApproved ? "Yes" : "No" },
    { label: "KYC Status", value: statusLabel },
    { label: "KYC ID", value: displayKyc?.id || "N/A" },
    { label: "User Code", value: displayKyc?.user_code || "N/A" },
    {
      label: "Applicant Name",
      value:
        [displayKyc?.first_name_en, displayKyc?.last_name_en]
          .filter(Boolean)
          .join(" ") || "N/A",
    },
    { label: "Country", value: displayKyc?.country_area || "N/A" },
    {
      label: "Identity Type",
      value: displayKyc
        ? mapIdentityTypeLabel(displayKyc.identity_card_type)
        : "N/A",
    },
    { label: "Identity Number", value: displayKyc?.identity_card || "N/A" },
    {
      label: "Validity Date",
      value: formatDate(displayKyc?.identity_card_validity_time),
    },
    { label: "Submitted At", value: formatDateTime(displayKyc?.submitted_at) },
    { label: "Approved At", value: formatDateTime(displayKyc?.approved_at) },
    { label: "Liveness", value: mapLivenessStatus(displayKyc) },
  ].filter(
    (item) =>
      item.value !== "N/A" ||
      ["KYC Filled", "Approved", "KYC Status"].includes(item.label),
  );

  if (displayKyc?.rejection_reason) {
    statusRows.push({
      label: "Rejection Reason",
      value: displayKyc.rejection_reason,
    });
  }

  const flowSteps = [
    {
      key: "submitted",
      label: "Submitted",
      time: displayKyc?.submitted_at || displayKyc?.created_at,
      state: displayKyc ? "done" : "pending",
    },
    {
      key: "review",
      label: "In Review",
      time: !displayKyc
        ? null
        : isApproved
          ? displayKyc?.approved_at || displayKyc?.updated_at
          : displayKyc?.updated_at,
      state: !displayKyc
        ? "pending"
        : ["approved", "rejected"].includes(String(statusRaw).toLowerCase())
          ? "done"
          : "current",
    },
    {
      key: "decision",
      label: isApproved
        ? "Approved"
        : String(statusRaw || "").toLowerCase() === "rejected"
          ? "Rejected"
          : "Decision Pending",
      time: isApproved
        ? displayKyc?.approved_at
        : String(statusRaw || "").toLowerCase() === "rejected"
          ? displayKyc?.updated_at
          : null,
      state: !displayKyc
        ? "pending"
        : isApproved || String(statusRaw || "").toLowerCase() === "rejected"
          ? "done"
          : "current",
    },
  ];

  const approvedBadgeText = hasFilledKyc
    ? isApproved
      ? "KYC Approved"
      : `KYC ${statusLabel}`
    : "KYC Not Submitted";

  return (
    <>
      <PageTitle motherMenu="KYC" activeMenu="KYC Submission" />

      <div className="nova-kyc-submit-page">
        <div className={`card nova-panel nova-kyc-hero-card mb-3 ${isApproved ? "is-approved" : ""}`}>
          <div className="card-body">
            {isApproved ? (
              <div className="nova-kyc-approved-hero">
                <div className="nova-kyc-approved-left">
                  <div className="nova-kyc-approved-icon">
                    <i className="fa fa-check-circle" />
                  </div>
                  <div>
                    <div className="nova-kyc-eyebrow">Tevau Verification</div>
                    <h3 className="nova-kyc-hero-title">KYC Verified</h3>
                    <div className="nova-kyc-pill-row">
                      <span className="nova-kyc-pill is-success">
                        <span className="nova-kyc-pill-dot" />
                        KYC Approved
                      </span>
                    </div>
                  </div>
                </div>
                <div className="nova-kyc-approved-stats">
                  <div className="nova-kyc-stat-box">
                    <span>Approved KYC ID</span>
                    <strong>{approvedKyc?.id || "N/A"}</strong>
                  </div>
                  <div className="nova-kyc-stat-box">
                    <span>Submitted At</span>
                    <strong>{formatDateTime(latestKyc?.submitted_at || latestKyc?.created_at)}</strong>
                  </div>
                  <div className="nova-kyc-stat-box">
                    <span>Approved At</span>
                    <strong>{formatDateTime(approvedKyc?.approved_at)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nova-kyc-hero-grid">
                <div>
                  <div className="nova-kyc-eyebrow">Tevau Verification</div>
                  <h3 className="nova-kyc-hero-title">KYC Submission Form</h3>
                  <div className="nova-kyc-pill-row">
                    <span className={`nova-kyc-pill is-${statusTone}`}>
                      <span className="nova-kyc-pill-dot" />
                      {approvedBadgeText}
                    </span>
                  </div>
                </div>
                <div className="nova-kyc-hero-side">
                  <div className="nova-kyc-stat-box">
                    <span>Approved KYC ID</span>
                    <strong>{approvedKyc?.id || "No approved KYC"}</strong>
                  </div>
                  <div className="nova-kyc-stat-box">
                    <span>Latest Submission</span>
                    <strong>{formatDateTime(latestKyc?.submitted_at || latestKyc?.created_at)}</strong>
                  </div>
                  <div className="nova-kyc-stat-box">
                    <span>Approved At</span>
                    <strong>{formatDateTime(approvedKyc?.approved_at)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isApproved && <div className="card nova-panel nova-kyc-guide-card mb-3">
          <div className="card-body">
            <h5 className="mb-2">Submission Guide</h5>
            <ul className="nova-kyc-guide-list">
              <li>Enter names in English exactly as shown on the document.</li>
              <li>
                Images should not be blurred or cropped; all corners must be
                visible.
              </li>
              <li>ID Card requires both front and back images.</li>
              <li>
                Verify existing approved KYC details before submitting a new
                request.
              </li>
            </ul>
          </div>
        </div>}

        {isResolvingInitialView && (
          <div className="card nova-panel mb-3">
            <div className="card-body py-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="spinner-border text-primary"
                  role="status"
                  aria-label="Loading KYC details"
                />
                <div>
                  <h5 className="mb-1">Loading KYC Details...</h5>
                  <p className="mb-0 text-muted">
                    Checking existing KYC status and preparing the page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`row g-3 ${isResolvingInitialView ? "d-none" : ""}`}>
          {!isApproved && (
            <div className="col-12">
              <div className="card nova-panel nova-kyc-form-card">
                <div className="card-body">
                  <div className="nova-kyc-section-header">
                    <div>
                      <h4 className="mb-1">KYC Submission Form</h4>
                      <p className="mb-0 text-muted">
                        {isUnderReview
                          ? "KYC is under review."
                          : "If the user already has a submitted/approved KYC record, fields are auto-filled. File inputs cannot be auto-filled due to browser restrictions."}
                      </p>
                    </div>
                    <span className={`nova-kyc-status-chip is-${statusTone}`}>
                      {approvedBadgeText}
                    </span>
                  </div>

                  {kycError && (
                    <div className="nova-kyc-feedback is-error mb-3">
                      <i className="fa fa-exclamation-circle" />
                      <span>{kycError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="nova-kyc-form">
                    {isFormDisabledByStatus && (
                      <div className="nova-kyc-feedback is-warning-lite">
                        <i className="fa fa-lock" />
                        <span>
                          KYC is under review.
                        </span>
                      </div>
                    )}

                    <fieldset
                      className={`nova-kyc-form-fieldset ${
                        isFormDisabledByStatus ? "is-disabled" : ""
                      }`}
                      disabled={isFormDisabledByStatus || submitting}
                    >
                      <div className="nova-kyc-block">
                        <h6 className="nova-kyc-block-title">
                          Personal Information
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Country Area</label>
                            <input
                              className="form-control"
                              name="country_area"
                              value={formValues.country_area}
                              onChange={handleInputChange}
                              placeholder="US"
                              maxLength={2}
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">
                              First Name (EN)
                            </label>
                            <input
                              className="form-control"
                              name="first_name_en"
                              value={formValues.first_name_en}
                              onChange={handleInputChange}
                              placeholder="John"
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Last Name (EN)</label>
                            <input
                              className="form-control"
                              name="last_name_en"
                              value={formValues.last_name_en}
                              onChange={handleInputChange}
                              placeholder="Doe"
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Birthday</label>
                            <input
                              type="date"
                              className="form-control"
                              name="birthday"
                              value={formValues.birthday}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="nova-kyc-block">
                        <h6 className="nova-kyc-block-title">
                          Identity Details
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Identity Type</label>
                            <select
                              className="form-select"
                              name="identity_card_type"
                              value={formValues.identity_card_type}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="1">ID Card (Front + Back)</option>
                              <option value="2">Passport</option>
                              <option value="3">Driving License</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">
                              Identity Number
                            </label>
                            <input
                              className="form-control"
                              name="identity_card"
                              value={formValues.identity_card}
                              onChange={handleInputChange}
                              placeholder="42000-1234567-8"
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Validity Date</label>
                            <input
                              type="date"
                              className="form-control"
                              name="identity_card_validity_time"
                              value={formValues.identity_card_validity_time}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="nova-kyc-block">
                        <h6 className="nova-kyc-block-title">
                          Document Uploads
                        </h6>
                        <div className="row g-3">
                          <div className={formValues.identity_card_type === "1" ? "col-md-6" : "col-md-12"}>
                            <label
                              className="nova-kyc-upload-card"
                              htmlFor="identity_front_pic"
                            >
                              <div className="nova-kyc-upload-top">
                                <span className="nova-kyc-upload-icon">
                                  <i className="fa fa-id-card" />
                                </span>
                                <div>
                                  <strong>Front Side Image</strong>
                                  <p className="mb-0">
                                    JPG / PNG, clear readable image
                                  </p>
                                </div>
                              </div>
                              {files.identity_front_pic ? (
                                <div className="nova-kyc-upload-preview">
                                  <img
                                    src={URL.createObjectURL(files.identity_front_pic)}
                                    alt="Front preview"
                                    className="nova-kyc-preview-img"
                                  />
                                  <div className="nova-kyc-upload-file">
                                    <span className="nova-kyc-file-name">
                                      {files.identity_front_pic.name}
                                    </span>
                                    <span className="nova-kyc-file-meta">
                                      {formatFileSize(files.identity_front_pic.size)}
                                    </span>
                                  </div>
                                </div>
                              ) : displayKyc?.identity_front_pic_url ? (
                                <div className="nova-kyc-upload-preview">
                                  <img
                                    src={displayKyc.identity_front_pic_url}
                                    alt="Existing front"
                                    className="nova-kyc-preview-img"
                                  />
                                  <div className="nova-kyc-upload-file">
                                    <span className="nova-kyc-file-empty">
                                      Previously uploaded — click to replace
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="nova-kyc-upload-file">
                                  <span className="nova-kyc-file-empty">
                                    Click to choose file
                                  </span>
                                </div>
                              )}
                              <input
                                id="identity_front_pic"
                                type="file"
                                className="d-none"
                                accept="image/*"
                                onChange={handleFileChange("identity_front_pic")}
                              />
                            </label>
                          </div>

                          {formValues.identity_card_type === "1" && (
                          <div className="col-md-6">
                            <label
                              className="nova-kyc-upload-card"
                              htmlFor="identity_back_pic"
                            >
                              <div className="nova-kyc-upload-top">
                                <span className="nova-kyc-upload-icon">
                                  <i className="fa fa-address-card" />
                                </span>
                                <div>
                                  <strong>Back Side Image</strong>
                                  <p className="mb-0">
                                    ID card type 1 ke liye required
                                  </p>
                                </div>
                              </div>
                              {files.identity_back_pic ? (
                                <div className="nova-kyc-upload-preview">
                                  <img
                                    src={URL.createObjectURL(files.identity_back_pic)}
                                    alt="Back preview"
                                    className="nova-kyc-preview-img"
                                  />
                                  <div className="nova-kyc-upload-file">
                                    <span className="nova-kyc-file-name">
                                      {files.identity_back_pic.name}
                                    </span>
                                    <span className="nova-kyc-file-meta">
                                      {formatFileSize(files.identity_back_pic.size)}
                                    </span>
                                  </div>
                                </div>
                              ) : displayKyc?.identity_back_pic_url ? (
                                <div className="nova-kyc-upload-preview">
                                  <img
                                    src={displayKyc.identity_back_pic_url}
                                    alt="Existing back"
                                    className="nova-kyc-preview-img"
                                  />
                                  <div className="nova-kyc-upload-file">
                                    <span className="nova-kyc-file-empty">
                                      Previously uploaded — click to replace
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="nova-kyc-upload-file">
                                  <span className="nova-kyc-file-empty">
                                    Click to choose file
                                  </span>
                                </div>
                              )}
                              <input
                                id="identity_back_pic"
                                type="file"
                                className="d-none"
                                accept="image/*"
                                onChange={handleFileChange("identity_back_pic")}
                              />
                            </label>
                          </div>
                          )}
                        </div>
                      </div>

                    </fieldset>

                    {(submitError || submitMessage) && (
                      <div
                        className={`nova-kyc-feedback ${
                          submitError ? "is-error" : "is-success"
                        }`}
                      >
                        <i
                          className={`fa ${
                            submitError
                              ? "fa-exclamation-circle"
                              : "fa-check-circle"
                          }`}
                        />
                        <span>{submitError || submitMessage}</span>
                      </div>
                    )}

                    {faceVerifyUrl && (
                      <div className="nova-kyc-face-verify-box">
                        <div className="nova-kyc-face-verify-info">
                          <i className="fa fa-camera" />
                          <div>
                            <strong>Face Verification Required</strong>
                            <span>Complete face verification to finalize your KYC.</span>
                          </div>
                        </div>
                        <a
                          href={faceVerifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary"
                        >
                          Start Face Verification
                        </a>
                      </div>
                    )}

                    <div className="nova-kyc-form-actions">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleRefreshKyc}
                        disabled={submitting || kycLoading || refreshing}
                      >
                        {kycLoading || refreshing
                          ? "Refreshing..."
                          : "Refresh KYC Data"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-light border"
                        onClick={handleReset}
                        disabled={submitting || isFormDisabledByStatus}
                      >
                        Reset Form
                      </button>
                       <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting || isFormDisabledByStatus}
                      >
                        {submitting ? "Submitting..." : "Submit KYC"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Kyc;
