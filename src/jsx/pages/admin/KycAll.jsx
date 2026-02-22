import React, { useEffect, useMemo, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { request } from "../../../utils/api";

const INITIAL_FORM_VALUES = {
  country_area: "US",
  first_name_en: "",
  last_name_en: "",
  birthday: "",
  identity_card_type: "1",
  identity_card: "",
  identity_card_validity_time: "",
  provider: "1",
  api_version: "v1",
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

const normalizeStatusLabel = (value) => {
  if (!value) return "Not Submitted";
  return String(value)
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getStatusTone = (value) => {
  const status = String(value || "").toLowerCase().trim();
  if (["approved", "success", "verified", "passed"].includes(status)) return "success";
  if (["rejected", "failed", "declined", "error"].includes(status)) return "danger";
  if (["pending", "submitted", "processing", "review"].includes(status)) return "warning";
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

const extractKycPage = (response) => {
  const envelope = response && typeof response === "object" ? response : {};
  const page =
    envelope?.data && typeof envelope.data === "object" ? envelope.data : {};
  const rows = Array.isArray(page?.data) ? page.data : [];

  return {
    envelope,
    page,
    rows,
    currentPage: Number(page?.current_page || 1) || 1,
    lastPage: Number(page?.last_page || 1) || 1,
    total: Number(page?.total || rows.length || 0) || 0,
  };
};

const sortByLatest = (rows = []) =>
  [...rows].sort((a, b) => {
    const aTime = new Date(
      a?.submitted_at || a?.updated_at || a?.created_at || 0,
    ).getTime();
    const bTime = new Date(
      b?.submitted_at || b?.updated_at || b?.created_at || 0,
    ).getTime();
    return bTime - aTime;
  });

const dedupeById = (rows = []) =>
  Array.from(
    new Map(
      rows.map((row, index) => [String(row?.id ?? `kyc-${index}`), row]),
    ).values(),
  );

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
    country_area: String(record?.country_area || INITIAL_FORM_VALUES.country_area).toUpperCase(),
    first_name_en: record?.first_name_en || "",
    last_name_en: record?.last_name_en || "",
    birthday: toInputDate(record?.birthday),
    identity_card_type: String(
      record?.identity_card_type || INITIAL_FORM_VALUES.identity_card_type,
    ),
    identity_card: record?.identity_card || "",
    identity_card_validity_time: toInputDate(record?.identity_card_validity_time),
    provider: String(record?.provider || INITIAL_FORM_VALUES.provider),
    api_version: String(record?.api_version || INITIAL_FORM_VALUES.api_version),
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

const KycAll = () => {
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycRows, setKycRows] = useState([]);
  const [kycMeta, setKycMeta] = useState({
    total: 0,
    last_page: 1,
  });

  const sortedKycRows = useMemo(() => sortByLatest(kycRows), [kycRows]);

  const approvedKyc = useMemo(
    () =>
      sortedKycRows.find(
        (item) => String(item?.status || "").toLowerCase() === "approved",
      ) || null,
    [sortedKycRows],
  );

  const latestKyc = sortedKycRows[0] || null;
  const displayKyc = approvedKyc || latestKyc;

  const statusRaw = displayKyc?.status || "";
  const statusLabel = normalizeStatusLabel(statusRaw);
  const statusTone = getStatusTone(statusRaw);
  const isApproved = String(statusRaw || "").toLowerCase() === "approved";
  const hasFilledKyc = Boolean(displayKyc);

  const hydrateFormFromRecord = (record) => {
    const next = toFormValuesFromKyc(record);
    if (!next) return;
    setFormValues((prev) => ({
      ...prev,
      ...next,
    }));
  };

  const loadKycList = async () => {
    setKycLoading(true);
    setKycError("");

    try {
      const firstResponse = await request({
        url: "/tevau/kyc",
        method: "GET",
        data: {
          page: 1,
          per_page: 50,
        },
      });

      const firstPage = extractKycPage(firstResponse);
      let allRows = [...firstPage.rows];

      if (firstPage.lastPage > 1) {
        const pageRequests = Array.from(
          { length: firstPage.lastPage - 1 },
          (_, index) =>
            request({
              url: "/tevau/kyc",
              method: "GET",
              data: {
                page: index + 2,
                per_page: 50,
              },
            }),
        );

        const pageResponses = await Promise.all(pageRequests);
        const extraRows = pageResponses.flatMap(
          (pageResponse) => extractKycPage(pageResponse).rows,
        );
        allRows = [...allRows, ...extraRows];
      }

      const normalizedRows = dedupeById(allRows);
      const sortedRows = sortByLatest(normalizedRows);

      setKycRows(sortedRows);
      setKycMeta({
        total: firstPage.total || sortedRows.length,
        last_page: firstPage.lastPage,
      });

      const approvedRecord =
        sortedRows.find(
          (item) => String(item?.status || "").toLowerCase() === "approved",
        ) || null;
      const preferredRecord = approvedRecord || sortedRows[0] || null;

      if (preferredRecord) {
        hydrateFormFromRecord(preferredRecord);
      }
    } catch (error) {
      setKycError(getApiErrorMessage(error));
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    loadKycList();
  }, []);

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
      setSubmitError("Front side image required hai.");
      return;
    }

    if (formValues.identity_card_type === "1" && !files.identity_back_pic) {
      setSubmitError("ID Card type ke liye back side image bhi required hai.");
      return;
    }

    const formData = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
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
        url: "/tevau/kyc",
        method: "POST",
        data: formData,
      });

      setSubmitMessage(
        response?.message || response?.msg || "KYC submission sent successfully.",
      );

      setFiles(INITIAL_FILES);
      await loadKycList();
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
      value: displayKyc ? mapIdentityTypeLabel(displayKyc.identity_card_type) : "N/A",
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
      time:
        !displayKyc
          ? null
          : isApproved
            ? displayKyc?.approved_at || displayKyc?.updated_at
            : displayKyc?.updated_at,
      state:
        !displayKyc
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
      state:
        !displayKyc
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
        <div className="card nova-panel nova-kyc-hero-card mb-3">
          <div className="card-body">
            <div className="nova-kyc-hero-grid">
              <div>
                <div className="nova-kyc-eyebrow">Tevau Verification</div>
                <h3 className="nova-kyc-hero-title">KYC Submission Form</h3>
                <p className="nova-kyc-hero-text">
                  Existing KYC record auto-load hoga, form fields fill honge, aur
                  approved/pending status yahin GET /tevau/kyc response se show hoga.
                </p>
                <div className="nova-kyc-pill-row">
                  <span className={`nova-kyc-pill is-${statusTone}`}>
                    <span className="nova-kyc-pill-dot" />
                    {approvedBadgeText}
                  </span>
                  <span className="nova-kyc-pill is-neutral">
                    Filled: {hasFilledKyc ? "Yes" : "No"}
                  </span>
                  <span className="nova-kyc-pill is-neutral">
                    Total Records: {kycMeta.total || 0}
                  </span>
                  <span className="nova-kyc-pill is-neutral">
                    Latest ID: {latestKyc?.id || "N/A"}
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
          </div>
        </div>

        <div className="card nova-panel nova-kyc-guide-card mb-3">
          <div className="card-body">
            <h5 className="mb-2">Submission Guide</h5>
            <ul className="nova-kyc-guide-list">
              <li>Names English me bilkul document ke mutabiq enter karein.</li>
              <li>Images blur/crop na hon, corners clearly visible hon.</li>
              <li>ID Card type `1` me front aur back dono images required hain.</li>
              <li>Approved status aur filled fields GET /tevau/kyc se auto-show honge.</li>
              <li>New submit karne se pehle existing approved KYC details verify karein.</li>
            </ul>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-8">
            <div className="card nova-panel nova-kyc-form-card">
              <div className="card-body">
                <div className="nova-kyc-section-header">
                  <div>
                    <h4 className="mb-1">KYC Submission Form</h4>
                    <p className="mb-0 text-muted">
                      Agar user ki KYC pehle submit/approved hai to fields auto-filled
                      milengi. File inputs browser restrictions ki wajah se auto-fill nahi hote.
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
                  <div className="nova-kyc-block">
                    <h6 className="nova-kyc-block-title">Personal Information</h6>
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
                        <label className="form-label">First Name (EN)</label>
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
                    <h6 className="nova-kyc-block-title">Identity Details</h6>
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
                        <label className="form-label">Identity Number</label>
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
                      <div className="col-md-3">
                        <label className="form-label">Provider</label>
                        <input
                          className="form-control"
                          name="provider"
                          value={formValues.provider}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">API Version</label>
                        <input
                          className="form-control"
                          name="api_version"
                          value={formValues.api_version}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nova-kyc-block">
                    <h6 className="nova-kyc-block-title">Document Uploads</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
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
                              <p className="mb-0">JPG / PNG, clear readable image</p>
                            </div>
                          </div>
                          <div className="nova-kyc-upload-file">
                            {files.identity_front_pic ? (
                              <>
                                <span className="nova-kyc-file-name">
                                  {files.identity_front_pic.name}
                                </span>
                                <span className="nova-kyc-file-meta">
                                  {formatFileSize(files.identity_front_pic.size)}
                                </span>
                              </>
                            ) : (
                              <span className="nova-kyc-file-empty">Click to choose file</span>
                            )}
                          </div>
                          <input
                            id="identity_front_pic"
                            type="file"
                            className="d-none"
                            accept="image/*"
                            onChange={handleFileChange("identity_front_pic")}
                          />
                        </label>
                      </div>

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
                              <p className="mb-0">ID card type 1 ke liye required</p>
                            </div>
                          </div>
                          <div className="nova-kyc-upload-file">
                            {files.identity_back_pic ? (
                              <>
                                <span className="nova-kyc-file-name">
                                  {files.identity_back_pic.name}
                                </span>
                                <span className="nova-kyc-file-meta">
                                  {formatFileSize(files.identity_back_pic.size)}
                                </span>
                              </>
                            ) : (
                              <span className="nova-kyc-file-empty">Click to choose file</span>
                            )}
                          </div>
                          <input
                            id="identity_back_pic"
                            type="file"
                            className="d-none"
                            accept="image/*"
                            onChange={handleFileChange("identity_back_pic")}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {(submitError || submitMessage) && (
                    <div
                      className={`nova-kyc-feedback ${
                        submitError ? "is-error" : "is-success"
                      }`}
                    >
                      <i
                        className={`fa ${
                          submitError ? "fa-exclamation-circle" : "fa-check-circle"
                        }`}
                      />
                      <span>{submitError || submitMessage}</span>
                    </div>
                  )}

                  <div className="nova-kyc-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit KYC"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-light border"
                      onClick={handleReset}
                      disabled={submitting}
                    >
                      Reset Form
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={loadKycList}
                      disabled={submitting || kycLoading}
                    >
                      {kycLoading ? "Refreshing..." : "Refresh KYC Data"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card nova-panel nova-kyc-status-card">
              <div className="card-body">
                <div className="nova-kyc-side-header">
                  <div>
                    <div className="nova-kyc-eyebrow">KYC Status</div>
                    <h5 className="mb-1">Filled / Approved Status</h5>
                    <p className="mb-0 text-muted">
                      GET /tevau/kyc se latest aur approved KYC record ka status.
                    </p>
                  </div>
                  <span className={`nova-kyc-status-chip is-${statusTone}`}>
                    {approvedBadgeText}
                  </span>
                </div>

                <div className={`nova-kyc-approval-banner is-${statusTone}`}>
                  <div className="nova-kyc-approval-icon">
                    <i
                      className={`fa ${
                        isApproved
                          ? "fa-check-circle"
                          : hasFilledKyc
                            ? "fa-clock"
                            : "fa-info-circle"
                      }`}
                    />
                  </div>
                  <div>
                    <strong>
                      {isApproved
                        ? "User KYC Approved Hai"
                        : hasFilledKyc
                          ? `User KYC ${statusLabel} Hai`
                          : "User ki KYC abhi submit nahi hui"}
                    </strong>
                    <span>
                      {displayKyc
                        ? `Record ID ${displayKyc.id} • ${formatDateTime(
                            displayKyc.submitted_at || displayKyc.created_at,
                          )}`
                        : "Form fill karke KYC submit karein."}
                    </span>
                  </div>
                </div>

                <div className="nova-kyc-kv-list">
                  {statusRows.map((row) => (
                    <div className="nova-kyc-kv-item" key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value || "N/A"}</strong>
                    </div>
                  ))}
                </div>

                <div className="nova-kyc-flow-box">
                  <h6>KYC Flow</h6>
                  <div className="nova-kyc-flow-list">
                    {flowSteps.map((step) => (
                      <div className={`nova-kyc-flow-item is-${step.state}`} key={step.key}>
                        <span className="nova-kyc-flow-dot" />
                        <div>
                          <strong>{step.label}</strong>
                          <small>{formatDateTime(step.time)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(displayKyc?.identity_front_pic_url || displayKyc?.identity_back_pic_url) && (
                  <div className="nova-kyc-docs-box">
                    <h6>Uploaded Documents</h6>
                    <div className="nova-kyc-docs-grid">
                      {displayKyc?.identity_front_pic_url && (
                        <a
                          className="nova-kyc-doc-card"
                          href={displayKyc.identity_front_pic_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={displayKyc.identity_front_pic_url}
                            alt="KYC Front"
                          />
                          <span>Front Side</span>
                        </a>
                      )}
                      {displayKyc?.identity_back_pic_url && (
                        <a
                          className="nova-kyc-doc-card"
                          href={displayKyc.identity_back_pic_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={displayKyc.identity_back_pic_url}
                            alt="KYC Back"
                          />
                          <span>Back Side</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KycAll;
