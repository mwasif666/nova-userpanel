import React, { useCallback, useContext, useEffect, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { AuthContext } from "../../../context/authContext";
import { request } from "../../../utils/api";
import { getSecurityCodeStatus } from "../../../services/securityCode";
import useKycApprovalStatus from "../../hooks/useKycApprovalStatus";
import { buildCardKycFlowState } from "../../hooks/useCardKycFlow";
import CardAccessNotice from "../../components/CardAccessNotice";

/* ── helpers ── */
const sanitize = (v) => String(v == null ? "" : v).trim();

const splitPhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("971") && digits.length > 3) {
    return { dial_code: "971", phone_number: digits.slice(3) };
  }
  return { dial_code: "971", phone_number: digits };
};

const makeVirtualForm = (user) => {
  const p = splitPhone(user?.phone);
  return {
    card_code: "1100",
    dial_code: p.dial_code,
    phone_number: p.phone_number,
    email: sanitize(user?.email),
    billing_address: { address: "", country_area: "PK", city: "", post_code: "" },
  };
};

const makePhysicalForm = (user) => {
  const p = splitPhone(user?.phone);
  return {
    card_code: "2100",
    dial_code: p.dial_code,
    phone_number: p.phone_number,
    email: sanitize(user?.email),
    postal_address: {
      address: "", city: "", province: "",
      country_area: "PK", post_code: "",
      first_name: "", last_name: "", recipient_title: "",
    },
  };
};

const buildPayload = (type, form) => {
  const base = {
    card_code: Number(form.card_code) || 0,
    dial_code: sanitize(form.dial_code),
    phone_number: sanitize(form.phone_number),
    email: sanitize(form.email),
  };
  if (type === "virtual") {
    const a = form.billing_address || {};
    return { ...base, billing_address: { address: sanitize(a.address), country_area: sanitize(a.country_area), city: sanitize(a.city), post_code: sanitize(a.post_code) } };
  }
  const a = form.postal_address || {};
  return { ...base, postal_address: { address: sanitize(a.address), city: sanitize(a.city), province: sanitize(a.province), country_area: sanitize(a.country_area), post_code: sanitize(a.post_code), first_name: sanitize(a.first_name), last_name: sanitize(a.last_name), recipient_title: sanitize(a.recipient_title) } };
};

const extractApiError = (error, fallback) => {
  const d = error?.response?.data || {};
  const first = d.errors && Object.values(d.errors).flat().find(Boolean);
  return String(first || d.message || d.error || error?.message || fallback).trim();
};

const validateForm = (type, form) => {
  if (!sanitize(form.card_code)) return "Card Code is required.";
  if (!sanitize(form.dial_code)) return "Dial Code is required.";
  if (!sanitize(form.phone_number)) return "Phone Number is required.";
  if (!sanitize(form.email)) return "Email is required.";
  const a = type === "virtual" ? form.billing_address : form.postal_address;
  if (!sanitize(a?.address)) return "Address is required.";
  if (!sanitize(a?.city)) return "City is required.";
  if (!sanitize(a?.country_area)) return "Country Code is required.";
  if (!sanitize(a?.post_code)) return "Post Code is required.";
  if (type === "physical") {
    if (!sanitize(a?.first_name)) return "First Name is required.";
    if (!sanitize(a?.last_name)) return "Last Name is required.";
    if (!sanitize(a?.province)) return "Province is required.";
  }
  return "";
};

const normalizeCardType = (v) => {
  if (v === 1 || v === "1") return "Physical";
  if (v === 2 || v === "2") return "Virtual";
  const t = String(v || "").toLowerCase();
  if (t.includes("virtual")) return "Virtual";
  if (t.includes("physical")) return "Physical";
  return String(v || "N/A");
};

const STATUS_MAP = {
  active:     { label: "Active",      cls: "nova-order-badge-success" },
  normal:     { label: "Active",      cls: "nova-order-badge-success" },
  pending:    { label: "Pending",     cls: "nova-order-badge-warning" },
  processing: { label: "Processing",  cls: "nova-order-badge-info" },
  shipped:    { label: "Shipped",     cls: "nova-order-badge-info" },
  delivered:  { label: "Delivered",   cls: "nova-order-badge-success" },
  frozen:     { label: "Frozen",      cls: "nova-order-badge-danger" },
  cancelled:  { label: "Cancelled",   cls: "nova-order-badge-danger" },
  inactive:   { label: "Inactive",    cls: "nova-order-badge-muted" },
};

const getStatusBadge = (status) => {
  const key = String(status || "").toLowerCase().trim();
  return STATUS_MAP[key] || { label: status || "N/A", cls: "nova-order-badge-muted" };
};

const formatDate = (v) => {
  if (!v) return "N/A";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

/* ── Field component ── */
const FormField = ({ label, value, onChange, placeholder, type = "text", inputMode, rows, colClass = "col-md-6" }) => (
  <div className={colClass}>
    <div className="nova-bind-field">
      <label>{label}</label>
      {rows > 0 ? (
        <textarea rows={rows} className="nova-bind-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} className="nova-bind-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />
      )}
    </div>
  </div>
);

/* ── Main page ── */
const CardOrderPage = () => {
  const { user } = useContext(AuthContext);

  const { loading: kycLoading, isApproved: isKycApproved, hasSubmittedKyc, statusLabel: kycStatusLabel } = useKycApprovalStatus();
  const [hasSecurityCode, setHasSecurityCode] = useState(false);
  const [securityStatusLoading, setSecurityStatusLoading] = useState(true);

  const [cardType, setCardType] = useState("virtual");
  const [vForm, setVForm] = useState(() => makeVirtualForm(user));
  const [pForm, setPForm] = useState(() => makePhysicalForm(user));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [physicalOrders, setPhysicalOrders] = useState([]);
  const [physicalOrdersLoading, setPhysicalOrdersLoading] = useState(false);
  const [physicalOrdersError, setPhysicalOrdersError] = useState("");
  const [trackingTab, setTrackingTab] = useState("pending");

  const userId = user?.id;
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;

  const hasPurchasedCard = orders.length > 0;
  const cardFlow = buildCardKycFlowState({ hasSubmittedKyc, isKycApproved, kycStatusLabel, hasPurchasedCard });

  const loadSecurityStatus = useCallback(async () => {
    setSecurityStatusLoading(true);
    try {
      const res = await getSecurityCodeStatus();
      setHasSecurityCode(Boolean(res?.hasSecurityCode));
    } catch {
      setHasSecurityCode(true);
    } finally {
      setSecurityStatusLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!userId && !userCode && !thirdId) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const res = await request({ url: "app/tevau/cards", method: "GET" });
      const payload = res?.data?.data ?? res?.data ?? [];
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      const filtered = rows.filter((row) => {
        const ru = row?.user_code || row?.tevau_user?.user_code;
        const rt = row?.third_id || row?.tevau_user?.third_id;
        const ri = row?.user_id || row?.tevau_user?.user_id || row?.tevau_user?.user?.id;
        return (userCode && ru === userCode) || (thirdId && rt === thirdId) || (userId && Number(ri) === Number(userId));
      });
      setOrders(filtered);
    } catch {
      setOrdersError("Failed to load order history.");
    } finally {
      setOrdersLoading(false);
    }
  }, [userId, userCode, thirdId]);

  const loadPhysicalOrders = useCallback(async () => {
    setPhysicalOrdersLoading(true);
    setPhysicalOrdersError("");
    try {
      const res = await request({ url: "app/tevau/physical-card-orders", method: "GET" });
      const payload = res?.data?.data ?? res?.data ?? [];
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setPhysicalOrders(rows);
    } catch {
      setPhysicalOrdersError("Failed to load physical card order tracking.");
    } finally {
      setPhysicalOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityStatus();
    loadOrders();
    loadPhysicalOrders();
  }, [loadSecurityStatus, loadOrders, loadPhysicalOrders]);

  const form = cardType === "virtual" ? vForm : pForm;
  const setForm = cardType === "virtual" ? setVForm : setPForm;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setAddress = (key, value) => {
    const aKey = cardType === "virtual" ? "billing_address" : "postal_address";
    setForm((prev) => ({ ...prev, [aKey]: { ...prev[aKey], [key]: value } }));
  };

  const address = cardType === "virtual" ? form.billing_address : form.postal_address;

  const handleSubmit = async () => {
    if (!cardFlow.canOrderCard) { setFeedback({ type: "error", message: cardFlow.orderBlockedReason || "Cannot order card at this time." }); return; }
    const validationError = validateForm(cardType, form);
    if (validationError) { setFeedback({ type: "error", message: validationError }); return; }

    setSubmitting(true);
    setFeedback({ type: "", message: "" });
    try {
      await request({ url: "app/tevau/cards", method: "POST", data: buildPayload(cardType, form) });
      setFeedback({ type: "success", message: `${cardType === "virtual" ? "Virtual" : "Physical"} card order submitted successfully.` });
      if (cardType === "virtual") setVForm(makeVirtualForm(user));
      else setPForm(makePhysicalForm(user));
      await Promise.all([loadOrders(), loadPhysicalOrders()]);
    } catch (error) {
      setFeedback({ type: "error", message: extractApiError(error, "Failed to submit card order.") });
    } finally {
      setSubmitting(false);
    }
  };

  const canOrder = cardFlow.canOrderCard && !kycLoading;

  return (
    <>
      <PageTitle motherMenu="Cards" activeMenu="Order Card" />
      <div className="row g-3">

        {!kycLoading && !cardFlow.canOrderCard && (
          <div className="col-12">
            <CardAccessNotice title={cardFlow.title} message={cardFlow.message} />
          </div>
        )}

        {/* ── Order form ── */}
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="nova-order-page-head">
                <div>
                  <h5 className="nova-email-stepper-title mb-1">Order a New Card</h5>
                  <p className="nova-email-stepper-sub mb-0">Choose card type and fill in the details below</p>
                </div>
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <span className={`nova-first-card-chip ${isKycApproved ? "is-done" : "is-pending"}`}>
                    <i className={`pi ${isKycApproved ? "pi-check-circle" : "pi-clock"}`} />
                    KYC: {kycLoading ? "Checking..." : kycStatusLabel}
                  </span>
                </div>
              </div>

              {/* Card type selector */}
              <div className="nova-order-type-tabs">
                <button
                  type="button"
                  className={`nova-order-type-tab ${cardType === "virtual" ? "is-active" : ""}`}
                  onClick={() => setCardType("virtual")}
                >
                  <i className="pi pi-mobile" />
                  <div>
                    <strong>Virtual Card</strong>
                    <span>Instant issue · Online payments</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`nova-order-type-tab ${cardType === "physical" ? "is-active" : ""}`}
                  onClick={() => setCardType("physical")}
                >
                  <i className="pi pi-credit-card" />
                  <div>
                    <strong>Physical Card</strong>
                    <span>Courier delivery · Full card</span>
                  </div>
                </button>
              </div>

              {/* Form fields */}
              <div className="nova-order-form-wrap">
                <div className="nova-order-section-label">Contact & Card Info</div>
                <div className="row g-3">
                  <FormField label="Dial Code" value={form.dial_code} onChange={(v) => setField("dial_code", v)} placeholder="971" inputMode="numeric" colClass="col-md-2" />
                  <FormField label="Phone Number" value={form.phone_number} onChange={(v) => setField("phone_number", v)} placeholder="581231234" inputMode="numeric" colClass="col-md-4" />
                  <FormField label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} placeholder="user@mail.com" colClass="col-md-6" />
                </div>

                <div className="nova-order-section-label mt-3">
                  {cardType === "virtual" ? "Billing Address" : "Postal / Delivery Address"}
                </div>
                <div className="row g-3">
                  {cardType === "physical" && (
                    <>
                      <FormField label="First Name" value={address.first_name} onChange={(v) => setAddress("first_name", v)} placeholder="Ali" colClass="col-md-4" />
                      <FormField label="Last Name" value={address.last_name} onChange={(v) => setAddress("last_name", v)} placeholder="Khan" colClass="col-md-4" />
                      <FormField label="Recipient Title" value={address.recipient_title} onChange={(v) => setAddress("recipient_title", v)} placeholder="Mr Ali Khan" colClass="col-md-4" />
                      <FormField label="Province" value={address.province} onChange={(v) => setAddress("province", v)} placeholder="Sindh" colClass="col-md-3" />
                    </>
                  )}
                  <FormField label="City" value={address.city} onChange={(v) => setAddress("city", v)} placeholder="Karachi" colClass={cardType === "physical" ? "col-md-3" : "col-md-4"} />
                  <FormField label="Country Code" value={address.country_area} onChange={(v) => setAddress("country_area", v)} placeholder="PK" colClass={cardType === "physical" ? "col-md-3" : "col-md-4"} />
                  <FormField label="Post Code" value={address.post_code} onChange={(v) => setAddress("post_code", v)} placeholder="74000" inputMode="numeric" colClass={cardType === "physical" ? "col-md-3" : "col-md-4"} />
                  <FormField label="Address" value={address.address} onChange={(v) => setAddress("address", v)} placeholder="Plot 36F, Street 6, Block 2..." rows={2} colClass="col-12" />
                </div>

              </div>

              {feedback.message && (
                <div className={`nova-kyc-feedback mt-3 ${feedback.type === "error" ? "is-error" : "is-success"}`}>
                  <i className={`fa ${feedback.type === "error" ? "fa-exclamation-circle" : "fa-check-circle"}`} />
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="nova-order-submit-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || !canOrder}
                >
                  {submitting ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Submitting Order...</>
                  ) : (
                    <><i className="pi pi-check me-2" />Submit {cardType === "virtual" ? "Virtual" : "Physical"} Card Order</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary ms-2"
                  onClick={() => {
                    if (cardType === "virtual") setVForm(makeVirtualForm(user));
                    else setPForm(makePhysicalForm(user));
                    setFeedback({ type: "", message: "" });
                  }}
                >
                  <i className="pi pi-times me-2" />Clear Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Physical Card Order Tracking ── */}
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-0">Physical Card Order Tracking</h5>
                  <p className="text-muted small mb-0 mt-1">Live tracking of your physical card orders via delivery status.</p>
                </div>
                <button
                  type="button"
                  className="nova-google-footer-btn"
                  onClick={loadPhysicalOrders}
                  disabled={physicalOrdersLoading}
                >
                  {physicalOrdersLoading
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="pi pi-refresh me-1" />Refresh</>}
                </button>
              </div>

              {/* Tabs */}
              <div className="nova-tracking-tabs">
                <button
                  type="button"
                  className={`nova-tracking-tab ${trackingTab === "pending" ? "is-active" : ""}`}
                  onClick={() => setTrackingTab("pending")}
                >
                  <i className="pi pi-clock me-2" />
                  Active Orders
                  {(() => {
                    const cnt = physicalOrders.filter((o) => String(o?.delivery_status || "").toLowerCase() !== "delivered").length;
                    return cnt > 0 ? <span className="nova-tracking-tab-count">{cnt}</span> : null;
                  })()}
                </button>
                <button
                  type="button"
                  className={`nova-tracking-tab ${trackingTab === "delivered" ? "is-active" : ""}`}
                  onClick={() => setTrackingTab("delivered")}
                >
                  <i className="pi pi-check-circle me-2" />
                  Delivered
                  {(() => {
                    const cnt = physicalOrders.filter((o) => String(o?.delivery_status || "").toLowerCase() === "delivered").length;
                    return cnt > 0 ? <span className="nova-tracking-tab-count is-delivered">{cnt}</span> : null;
                  })()}
                </button>
              </div>

              {physicalOrdersError && (
                <div className="nova-kyc-feedback is-error mb-3">
                  <i className="fa fa-exclamation-circle" /><span>{physicalOrdersError}</span>
                </div>
              )}

              {(() => {
                const rows = physicalOrders.filter((o) =>
                  trackingTab === "delivered"
                    ? String(o?.delivery_status || "").toLowerCase() === "delivered"
                    : String(o?.delivery_status || "").toLowerCase() !== "delivered",
                );

                return (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Order Reference</th>
                          <th>Delivery Status</th>
                          <th>Ordered On</th>
                          <th>Shipped On</th>
                          {trackingTab === "delivered" && <th>Delivered On</th>}
                          <th>City</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!physicalOrdersLoading && rows.length === 0 ? (
                          <tr>
                            <td colSpan={trackingTab === "delivered" ? 7 : 6} className="text-center text-muted py-4">
                              <i className="pi pi-inbox me-2" />
                              {trackingTab === "delivered" ? "No delivered orders yet." : "No active orders found."}
                            </td>
                          </tr>
                        ) : (
                          rows.map((order) => {
                            const badge = getStatusBadge(order?.delivery_status);
                            const city = order?.postal_address?.city || "N/A";
                            return (
                              <tr key={String(order?.id)}>
                                <td>
                                  <span className="nova-tracking-ref">
                                    {order?.order_reference || `#${order?.id}`}
                                  </span>
                                </td>
                                <td><span className={`nova-order-badge ${badge.cls}`}>{badge.label}</span></td>
                                <td className="text-muted small">{formatDate(order?.created_at)}</td>
                                <td className="text-muted small">{formatDate(order?.shipped_at)}</td>
                                {trackingTab === "delivered" && (
                                  <td className="text-muted small">{formatDate(order?.delivered_at)}</td>
                                )}
                                <td className="text-muted small">{city}</td>
                                <td className="text-muted small">{order?.delivery_notes || "—"}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default CardOrderPage;
