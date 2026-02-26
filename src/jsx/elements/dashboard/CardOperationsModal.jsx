import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import virtualCardImage from "../../../assets/images/virtual_card.jpeg";
import physicalCardImage from "../../../assets/images/nova_card.png";
import { request } from "../../../utils/api";

const CARD_ORDER_CONFIG = {
  virtual: {
    label: "Virtual Card",
    shortLabel: "Virtual",
    cardCode: 1100,
    addressKey: "billing_address",
    addressTitle: "Billing Address",
    hint: "Instant issue flow with billing address verification.",
    image: virtualCardImage,
  },
  physical: {
    label: "Physical Card",
    shortLabel: "Physical",
    cardCode: 2100,
    addressKey: "postal_address",
    addressTitle: "Postal Address",
    hint: "Courier delivery flow with full recipient details.",
    image: physicalCardImage,
  },
};

const ORDER_COMMON_FIELDS = [
  {
    key: "card_code",
    label: "Card Code",
    placeholder: "1100 / 2100",
    inputMode: "numeric",
  },
  {
    key: "dial_code",
    label: "Dial Code",
    placeholder: "971",
    inputMode: "numeric",
  },
  {
    key: "phone_number",
    label: "Phone Number",
    placeholder: "581231234",
    inputMode: "numeric",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "user@mail.com",
    type: "email",
  },
];

const VIRTUAL_ADDRESS_FIELDS = [
  {
    key: "address",
    label: "Address",
    placeholder: "Plot 36F, street 6, Block2...",
    rows: 2,
    colClass: "col-12",
  },
  { key: "country_area", label: "Country Area", placeholder: "PK" },
  { key: "city", label: "City", placeholder: "Karachi" },
  { key: "post_code", label: "Post Code", placeholder: "74000" },
];

const PHYSICAL_ADDRESS_FIELDS = [
  {
    key: "address",
    label: "Address",
    placeholder: "Plot 36F, street 6, Block2...",
    rows: 2,
    colClass: "col-12",
  },
  { key: "first_name", label: "First Name", placeholder: "Waleed" },
  { key: "last_name", label: "Last Name", placeholder: "Ghori" },
  {
    key: "recipient_title",
    label: "Recipient Title",
    placeholder: "Mr Waleed Khan Ghori",
    colClass: "col-12",
  },
  { key: "city", label: "City", placeholder: "Karachi" },
  { key: "province", label: "Province", placeholder: "Sindh" },
  { key: "country_area", label: "Country Area", placeholder: "PK" },
  { key: "post_code", label: "Post Code", placeholder: "7400" },
];

const BIND_FIELDS = [
  {
    key: "active_code",
    label: "Activation Code",
    placeholder: "440728",
    inputMode: "numeric",
  },
  {
    key: "card_number",
    label: "Card Number",
    placeholder: "9018",
    inputMode: "numeric",
  },
  {
    key: "dial_code",
    label: "Dial Code",
    placeholder: "971",
    inputMode: "numeric",
  },
  {
    key: "phone_number",
    label: "Phone Number",
    placeholder: "581231234",
    inputMode: "numeric",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "user@maildrop.cc",
    type: "email",
    colClass: "col-12",
  },
  {
    key: "address",
    label: "Address",
    placeholder: "Room 102 How Ming Street Kwun Tong Kowloon",
    rows: 2,
    colClass: "col-12",
  },
  { key: "country_area", label: "Country Area", placeholder: "HK" },
  { key: "city", label: "City", placeholder: "HongKong" },
  { key: "post_code", label: "Post Code", placeholder: "123456" },
];

const sanitizeText = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const splitPhoneParts = (phoneValue) => {
  const digits = String(phoneValue || "").replace(/\D/g, "");
  if (!digits) {
    return { dial_code: "971", phone_number: "" };
  }
  if (digits.startsWith("971") && digits.length > 3) {
    return {
      dial_code: "971",
      phone_number: digits.slice(3),
    };
  }
  return {
    dial_code: "971",
    phone_number: digits,
  };
};

const buildPrefill = (user) => {
  const phone = splitPhoneParts(user?.phone);
  return {
    email: sanitizeText(user?.email),
    dial_code: phone.dial_code,
    phone_number: phone.phone_number,
  };
};

const createOrderForms = (prefill) => ({
  virtual: {
    card_code: CARD_ORDER_CONFIG.virtual.cardCode,
    dial_code: prefill.dial_code || "971",
    phone_number: prefill.phone_number || "",
    email: prefill.email || "",
    billing_address: {
      address: "",
      country_area: "PK",
      city: "",
      post_code: "",
    },
  },
  physical: {
    card_code: CARD_ORDER_CONFIG.physical.cardCode,
    dial_code: prefill.dial_code || "971",
    phone_number: prefill.phone_number || "",
    email: prefill.email || "",
    postal_address: {
      address: "",
      city: "",
      province: "",
      country_area: "PK",
      post_code: "",
      first_name: "",
      last_name: "",
      recipient_title: "",
    },
  },
});

const createBindForm = (prefill) => ({
  active_code: "",
  card_number: "",
  address: "",
  country_area: "HK",
  city: "",
  post_code: "",
  dial_code: prefill.dial_code || "971",
  phone_number: prefill.phone_number || "",
  email: prefill.email || "",
});

const extractApiErrorMessage = (error, fallbackMessage) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  if (typeof message === "string" && message.trim()) return message;

  const errors = error?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat()[0];
    if (typeof first === "string" && first.trim()) return first;
  }
  return fallbackMessage;
};

const validateRequiredFields = (fields) => {
  const missing = fields.find((field) => !sanitizeText(field.value));
  return missing ? `${missing.label} is required.` : "";
};

const mergeUserPrefillIntoOrderForms = (forms, prefill) => ({
  virtual: {
    ...forms.virtual,
    dial_code: forms.virtual.dial_code || prefill.dial_code,
    phone_number: forms.virtual.phone_number || prefill.phone_number,
    email: forms.virtual.email || prefill.email,
  },
  physical: {
    ...forms.physical,
    dial_code: forms.physical.dial_code || prefill.dial_code,
    phone_number: forms.physical.phone_number || prefill.phone_number,
    email: forms.physical.email || prefill.email,
  },
});

const mergeUserPrefillIntoBindForm = (form, prefill) => ({
  ...form,
  dial_code: form.dial_code || prefill.dial_code,
  phone_number: form.phone_number || prefill.phone_number,
  email: form.email || prefill.email,
});

const CardOperationsModal = ({
  show,
  onHide,
  user,
  userCards = [],
  onCardsUpdated,
  walletSummary = null,
  onWalletUpdated,
  inline = false,
}) => {
  const prefill = useMemo(() => buildPrefill(user), [user]);
  const [orderTab, setOrderTab] = useState("virtual");
  const [orderForms, setOrderForms] = useState(() => createOrderForms(prefill));
  const [bindForm, setBindForm] = useState(() => createBindForm(prefill));
  const [submittingAction, setSubmittingAction] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    if (!inline && !show) return;
    setOrderForms((prev) => mergeUserPrefillIntoOrderForms(prev, prefill));
    setBindForm((prev) => mergeUserPrefillIntoBindForm(prev, prefill));
  }, [inline, prefill, show]);

  const activeOrderConfig = CARD_ORDER_CONFIG[orderTab];
  const activeOrderForm = orderForms[orderTab];
  const activeAddress =
    activeOrderForm?.[activeOrderConfig.addressKey] || {};

  const renderField = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    rows = 0,
    colClass = "col-md-6",
    inputMode,
  }) => (
    <div className={colClass} key={label}>
      <label className="nova-flow-field">
        <span className="nova-flow-field-label">{label}</span>
        {rows > 0 ? (
          <textarea
            rows={rows}
            className="form-control nova-flow-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            className="form-control nova-flow-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            inputMode={inputMode}
          />
        )}
      </label>
    </div>
  );

  const setOrderField = (typeKey, key, value) => {
    setOrderForms((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        [key]: value,
      },
    }));
  };

  const setOrderAddressField = (typeKey, key, value) => {
    const addressKey = CARD_ORDER_CONFIG[typeKey].addressKey;
    setOrderForms((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        [addressKey]: {
          ...prev[typeKey][addressKey],
          [key]: value,
        },
      },
    }));
  };

  const setBindField = (key, value) => {
    setBindForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateOrder = (typeKey) => {
    const config = CARD_ORDER_CONFIG[typeKey];
    const form = orderForms[typeKey];
    const address = form?.[config.addressKey] || {};
    const commonError = validateRequiredFields(
      ORDER_COMMON_FIELDS.map((field) => ({
        label: field.label,
        value: form?.[field.key],
      })),
    );
    if (commonError) return commonError;

    const cardCode = Number(form.card_code);
    if (!Number.isFinite(cardCode) || cardCode <= 0) {
      return "Card Code must be a valid number.";
    }

    const addressFields =
      typeKey === "virtual" ? VIRTUAL_ADDRESS_FIELDS : PHYSICAL_ADDRESS_FIELDS;

    return validateRequiredFields(
      addressFields.map((field) => ({
        label: `${config.addressTitle} - ${field.label}`,
        value: address[field.key],
      })),
    );
  };

  const validateBind = () =>
    validateRequiredFields(
      BIND_FIELDS.map((field) => ({
        label: field.label,
        value: bindForm[field.key],
      })),
    );

  const buildOrderPayload = (typeKey) => {
    const config = CARD_ORDER_CONFIG[typeKey];
    const form = orderForms[typeKey];
    const address = form?.[config.addressKey] || {};

    const common = {
      card_code: Number(form.card_code),
      dial_code: sanitizeText(form.dial_code),
      phone_number: sanitizeText(form.phone_number),
      email: sanitizeText(form.email),
    };

    if (typeKey === "virtual") {
      return {
        ...common,
        billing_address: {
          address: sanitizeText(address.address),
          country_area: sanitizeText(address.country_area),
          city: sanitizeText(address.city),
          post_code: sanitizeText(address.post_code),
        },
      };
    }

    return {
      ...common,
      postal_address: {
        address: sanitizeText(address.address),
        city: sanitizeText(address.city),
        province: sanitizeText(address.province),
        country_area: sanitizeText(address.country_area),
        post_code: sanitizeText(address.post_code),
        first_name: sanitizeText(address.first_name),
        last_name: sanitizeText(address.last_name),
        recipient_title: sanitizeText(address.recipient_title),
      },
    };
  };

  const resetOrderForm = (typeKey) => {
    setOrderForms((prev) => ({
      ...prev,
      [typeKey]: createOrderForms(prefill)[typeKey],
    }));
  };

  const resetBindForm = () => {
    setBindForm(createBindForm(prefill));
  };

  const handleOrderSubmit = async () => {
    const validationError = validateOrder(orderTab);
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    const actionKey = `order-${orderTab}`;
    setSubmittingAction(actionKey);
    setFeedback(null);

    try {
      const response = await request({
        url: "tevau/cards",
        method: "POST",
        data: buildOrderPayload(orderTab),
      });

      setApiResponse(response);
      setFeedback({
        type: "success",
        message: `${activeOrderConfig.label} order submitted successfully.`,
      });
      resetOrderForm(orderTab);

      if (typeof onCardsUpdated === "function") {
        await onCardsUpdated();
      }
      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setApiResponse(error?.response?.data || null);
      setFeedback({
        type: "error",
        message: extractApiErrorMessage(
          error,
          `Failed to submit ${activeOrderConfig.shortLabel.toLowerCase()} card order.`,
        ),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const handleBindSubmit = async () => {
    const validationError = validateBind();
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    setSubmittingAction("bind");
    setFeedback(null);

    try {
      const payload = {
        active_code: sanitizeText(bindForm.active_code),
        card_number: sanitizeText(bindForm.card_number),
        address: sanitizeText(bindForm.address),
        country_area: sanitizeText(bindForm.country_area),
        city: sanitizeText(bindForm.city),
        post_code: sanitizeText(bindForm.post_code),
        dial_code: sanitizeText(bindForm.dial_code),
        phone_number: sanitizeText(bindForm.phone_number),
        email: sanitizeText(bindForm.email),
      };

      const response = await request({
        url: "tevau/cards/bind",
        method: "POST",
        data: payload,
      });

      setApiResponse(response);
      setFeedback({
        type: "success",
        message: "Card bind request submitted successfully.",
      });
      resetBindForm();

      if (typeof onCardsUpdated === "function") {
        await onCardsUpdated();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setApiResponse(error?.response?.data || null);
      setFeedback({
        type: "error",
        message: extractApiErrorMessage(error, "Failed to bind card."),
      });
    } finally {
      setSubmittingAction("");
    }
  };

  const clearResponseState = () => {
    setFeedback(null);
    setApiResponse(null);
  };

  const userCardCount = Array.isArray(userCards) ? userCards.length : 0;
  const walletCurrency = String(walletSummary?.currency || "USD").toUpperCase();
  const walletAvailable =
    walletSummary?.availableBalance ?? walletSummary?.balance ?? null;

  const content = (
    <>
      <div className="nova-card-ops-modal-summary mb-3">
        <span className="nova-wallet-stat-chip">
          User: {sanitizeText(user?.email) || "N/A"}
        </span>
        <span className="nova-wallet-stat-chip">
          User Code: {user?.tevau_user?.user_code || "N/A"}
        </span>
        <span className="nova-wallet-stat-chip">
          Current Cards: {userCardCount}
        </span>
        {walletAvailable !== null && (
          <span className="nova-wallet-stat-chip">
            Wallet Available: {walletCurrency} {Number(walletAvailable || 0).toLocaleString("en-US")}
          </span>
        )}
      </div>

      <div className="row g-3">
        <div className="col-xl-7">
          <div className="nova-flow-shell">
            <div className="nova-flow-header">
              <div>
                <h4 className="mb-1">Order Card</h4>
                <p className="mb-0 text-muted">
                  `POST /tevau/cards` with physical or virtual payload
                </p>
              </div>
              <span
                className={`nova-flow-status-pill ${
                  orderTab === "virtual" ? "is-virtual" : "is-physical"
                }`}
              >
                {activeOrderConfig.shortLabel}
              </span>
            </div>

            <div className="nova-flow-switch" role="tablist" aria-label="Order card type">
              {Object.entries(CARD_ORDER_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`nova-flow-switch-btn ${
                    orderTab === key ? "is-active" : ""
                  } ${key === "virtual" ? "is-virtual" : "is-physical"}`}
                  onClick={() => setOrderTab(key)}
                >
                  <span className="nova-flow-switch-title">{config.label}</span>
                  <span className="nova-flow-switch-sub">{config.hint}</span>
                </button>
              ))}
            </div>

            <div
              className={`nova-flow-hero ${
                orderTab === "virtual" ? "is-virtual" : "is-physical"
              }`}
            >
              <div className="nova-flow-hero-copy">
                <div className="nova-flow-kicker">Card Order API</div>
                <h5>{activeOrderConfig.label}</h5>
                <p>{activeOrderConfig.hint}</p>
                <div className="nova-flow-hero-stats">
                  <div>
                    <span>Endpoint</span>
                    <strong>/tevau/cards</strong>
                  </div>
                  <div>
                    <span>Card Code</span>
                    <strong>{activeOrderForm.card_code}</strong>
                  </div>
                  <div>
                    <span>Address Key</span>
                    <strong>{activeOrderConfig.addressKey}</strong>
                  </div>
                </div>
              </div>
              <div className="nova-flow-hero-visual">
                <img
                  src={activeOrderConfig.image}
                  alt={activeOrderConfig.label}
                  className="nova-flow-hero-image"
                />
              </div>
            </div>

            <div className="nova-flow-section">
              <div className="nova-flow-section-head">
                <h6 className="mb-0">Requester Details</h6>
                <small>Common for both physical and virtual order requests</small>
              </div>
              <div className="row g-3">
                {ORDER_COMMON_FIELDS.map((field) =>
                  renderField({
                    label: field.label,
                    value: activeOrderForm[field.key] || "",
                    onChange: (value) => setOrderField(orderTab, field.key, value),
                    placeholder: field.placeholder,
                    type: field.type || "text",
                    colClass: field.colClass || "col-md-6",
                    inputMode: field.inputMode,
                  }),
                )}
              </div>
            </div>

            <div className="nova-flow-section">
              <div className="nova-flow-section-head">
                <h6 className="mb-0">{activeOrderConfig.addressTitle}</h6>
                <small>{activeOrderConfig.addressKey}</small>
              </div>
              <div className="row g-3">
                {(orderTab === "virtual"
                  ? VIRTUAL_ADDRESS_FIELDS
                  : PHYSICAL_ADDRESS_FIELDS
                ).map((field) =>
                  renderField({
                    label: field.label,
                    value: activeAddress[field.key] || "",
                    onChange: (value) =>
                      setOrderAddressField(orderTab, field.key, value),
                    placeholder: field.placeholder,
                    type: field.type || "text",
                    rows: field.rows || 0,
                    colClass: field.colClass || "col-md-6",
                    inputMode: field.inputMode,
                  }),
                )}
              </div>
            </div>

            <div className="nova-flow-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOrderSubmit}
                disabled={submittingAction === `order-${orderTab}`}
              >
                {submittingAction === `order-${orderTab}`
                  ? "Submitting..."
                  : `Submit ${activeOrderConfig.shortLabel} Order`}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  resetOrderForm(orderTab);
                  clearResponseState();
                }}
              >
                Reset Order Form
              </button>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="nova-flow-shell">
            <div className="nova-flow-header">
              <div>
                <h4 className="mb-1">Bind Card</h4>
                <p className="mb-0 text-muted">
                  `POST /tevau/cards/bind`
                </p>
              </div>
              <span className="nova-flow-status-pill is-bind">Bind Flow</span>
            </div>

            <div className="nova-bind-helper">
              <div className="nova-bind-helper-title">Request body fields</div>
              <div className="nova-bind-helper-list">
                <span>active_code</span>
                <span>card_number</span>
                <span>address</span>
                <span>country_area / city / post_code</span>
                <span>dial_code / phone_number / email</span>
              </div>
            </div>

            <div className="row g-3">
              {BIND_FIELDS.map((field) =>
                renderField({
                  label: field.label,
                  value: bindForm[field.key] || "",
                  onChange: (value) => setBindField(field.key, value),
                  placeholder: field.placeholder,
                  type: field.type || "text",
                  rows: field.rows || 0,
                  colClass: field.colClass || "col-md-6",
                  inputMode: field.inputMode,
                }),
              )}
            </div>

            <div className="nova-flow-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBindSubmit}
                disabled={submittingAction === "bind"}
              >
                {submittingAction === "bind" ? "Binding..." : "Bind Card"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  resetBindForm();
                  clearResponseState();
                }}
              >
                Reset Bind Form
              </button>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`nova-flow-alert is-${feedback.type} mt-3`}>
          <i
            className={`pi ${
              feedback.type === "success"
                ? "pi-check-circle"
                : "pi-exclamation-triangle"
            }`}
          />
          <span>{feedback.message}</span>
        </div>
      )}

      {apiResponse && (
        <div className="nova-flow-response mt-3">
          <div className="nova-flow-response-head">
            <span>API Response</span>
            <small>{submittingAction || "latest response"}</small>
          </div>
          <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="card nova-panel">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 mb-3">
            <div>
              <div className="nova-flow-kicker mb-1">Cards Management</div>
              <h4 className="mb-1">Card Purchasing + Bind Flow</h4>
              <p className="mb-0 text-muted">
                Card order submit `POST /tevau/cards` karta hai. Successful submit ke baad wallet summary refresh hoti hai taake auto deduction front par nazar aaye.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-light"
              onClick={clearResponseState}
            >
              Clear Status
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Modal
      centered
      size="xl"
      show={show}
      onHide={onHide}
      dialogClassName="nova-card-ops-modal"
    >
      <div className="modal-header">
        <div>
          <h5 className="modal-title">Cards: Order & Bind</h5>
          <div className="text-muted small">
            Tevau API flows for physical / virtual / bind card
          </div>
        </div>
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
        />
      </div>

      <div className="modal-body">{content}</div>

      <div className="modal-footer">
        <button type="button" className="btn btn-light" onClick={clearResponseState}>
          Clear Status
        </button>
        <button type="button" className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </div>
    </Modal>
  );
};

export default CardOperationsModal;
