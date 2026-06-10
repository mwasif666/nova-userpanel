import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal } from "react-bootstrap";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import PageTitle from "../../layouts/PageTitle";
import CardAccessNotice from "../../components/CardAccessNotice";
import CardPinModal from "../../elements/dashboard/CardPinModal";
import { AuthContext } from "../../../context/authContext";
import {
  getApiErrorMessage,
  formatMoney,
  maskCardLast4,
  normalizeCardType,
  normalizeStatus,
  toSafeNumber,
} from "../../../utils";
import {
  getAllDashboardCards,
  createEmptyCardLimits,
  getCardTransactionLimits,
  getDashboardWalletBalance,
} from "../../../services/dashboardWallet";
import { request } from "../../../utils/api";

const filterCardsForUser = ({ rows, userId, userCode, thirdId }) =>
  rows.filter((row) => {
    const rowUserCode = row?.user_code || row?.tevau_user?.user_code;
    const rowThirdId = row?.third_id || row?.tevau_user?.third_id;
    const rowUserId =
      row?.user_id || row?.tevau_user?.user_id || row?.tevau_user?.user?.id;

    return (
      (userCode && rowUserCode === userCode) ||
      (thirdId && rowThirdId === thirdId) ||
      (userId && Number(rowUserId) === Number(userId))
    );
  });

const getCardIdentity = (card) =>
  String(card?.id ?? card?.card_id ?? card?.tevau_response?.cardId ?? "");

const getTevauCardId = (card) =>
  String(card?.tevau_response?.cardId ?? card?.cardId ?? card?.card_id ?? "").trim();

const getCardName = (card, index = 0) =>
  card?.card_name ||
  card?.name ||
  `${normalizeCardType(card?.card_type || card?.type)} Card ${index + 1}`;

const getCardCurrency = (card) =>
  String(
    card?.currency || card?.tevau_response?.cardCurrency || "USD",
  ).toUpperCase();

const getCardBalance = (card) =>
  toSafeNumber(card?.balance ?? card?.tevau_response?.cardBalance) ?? 0;

const LIMITS_SECTION_CONFIG = [
  {
    key: "nonAtm",
    title: "Non-ATM Transactions",
    icon: "pi pi-credit-card",
  },
  {
    key: "atm",
    title: "ATM Transactions",
    icon: "pi pi-wallet",
  },
];

const LIMITS_ROW_CONFIG = [
  { key: "perTransaction", label: "Per Transaction Limit" },
  { key: "daily", label: "Daily Limit" },
  { key: "monthly", label: "Monthly Limit" },
  { key: "yearly", label: "Yearly Limit", optional: true },
];

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const isCardBound = (card) => {
  if (!card) return false;
  if (typeof card.is_bound === "boolean") return card.is_bound;
  const raw = String(card.is_bound ?? "").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
};

const formatLimitValue = (value) => {
  const numeric = toSafeNumber(value);
  if (numeric !== null) {
    return numeric.toLocaleString("en-US", {
      minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  if (hasValue(value)) {
    return String(value);
  }

  return "N/A";
};

const CardManagement = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const selectedCardIdFromState = String(
    location?.state?.selectedCardId || "",
  ).trim();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [walletSummary, setWalletSummary] = useState({
    balance: null,
    availableBalance: null,
    currency: "USD",
    assetName: "",
  });
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState("");
  const [cardLimits, setCardLimits] = useState(createEmptyCardLimits);

  const cardSwiperRef = useRef(null);
  const userId = user?.id;
  const userCode = user?.card_account?.user_code || null;
  const thirdId = user?.card_account?.third_id || null;

  const loadCards = useCallback(async () => {
    if (!userId) {
      setCards([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const rows = await getAllDashboardCards();
      const filtered = filterCardsForUser({ rows, userId, userCode, thirdId });
      setCards(filtered);
      setSelectedCardId((current) => {
        if (
          selectedCardIdFromState &&
          filtered.some(
            (card) => String(card?.id) === String(selectedCardIdFromState),
          )
        ) {
          return String(selectedCardIdFromState);
        }
        return current || getCardIdentity(filtered[0]);
      });
    } catch (fetchError) {
      setCards([]);
      setError("Failed to load cards.");
    } finally {
      setLoading(false);
    }
  }, [selectedCardIdFromState, thirdId, userCode, userId]);

  const loadWallet = useCallback(async () => {
    if (!userId && !userCode && !thirdId) return;

    try {
      const data = await getDashboardWalletBalance({
        userId,
        userCode,
        thirdId,
      });
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      const bestAsset =
        [...assets].sort((a, b) => {
          const aValue = Number(a?.available_balance ?? a?.balance ?? 0) || 0;
          const bValue = Number(b?.available_balance ?? b?.balance ?? 0) || 0;
          return bValue - aValue;
        })[0] || null;

      setWalletSummary({
        balance: bestAsset?.balance ?? null,
        availableBalance:
          bestAsset?.available_balance ?? bestAsset?.balance ?? null,
        currency: bestAsset?.currency || "USD",
        assetName: bestAsset?.name || "",
      });
    } catch (walletError) {
      setWalletSummary({
        balance: null,
        availableBalance: null,
        currency: "USD",
        assetName: "",
      });
    }
  }, [thirdId, userCode, userId]);

  useEffect(() => {
    loadCards().catch(() => undefined);
    loadWallet().catch(() => undefined);
  }, [loadCards, loadWallet]);

  useEffect(() => {
    if (!selectedCardIdFromState || !cards.length) return;

    const matchedCard = cards.find(
      (card) => String(card?.id) === String(selectedCardIdFromState),
    );
    if (matchedCard) {
      setSelectedCardId(String(matchedCard.id));
    }
  }, [cards, selectedCardIdFromState]);

  const selectedCard = useMemo(() => {
    const found = cards.find(
      (card) => getCardIdentity(card) === selectedCardId,
    );
    return found || cards[0] || null;
  }, [cards, selectedCardId]);

  useEffect(() => {
    const status = String(selectedCard?.status || "").toLowerCase();
    setFreezeEnabled(["frozen", "locked", "freeze", "lock"].includes(status));
  }, [selectedCard]);

  const selectedCardName = getCardName(selectedCard);
  const selectedCardType = normalizeCardType(
    selectedCard?.card_type || selectedCard?.type,
  );
  const selectedCardCurrency = getCardCurrency(selectedCard);
  const selectedCardBalance = getCardBalance(selectedCard);
  const selectedCardStatus = normalizeStatus(selectedCard?.status);
  const selectedCardIsBound = isCardBound(selectedCard);
  const selectedCardCreated = selectedCard?.created_at
    ? new Date(selectedCard.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "N/A";

  const quickStats = [
    {
      label: "Card Status",
      value: selectedCardStatus,
      tone:
        String(selectedCard?.status || "").toLowerCase() === "active"
          ? "is-success"
          : "is-accent",
    },
    {
      label: "Card Balance",
      value: formatMoney(selectedCardBalance, selectedCardCurrency),
      tone: "is-accent",
    },
    {
      label: "Wallet Available",
      value: formatMoney(
        walletSummary.availableBalance ?? walletSummary.balance ?? 0,
        walletSummary.currency,
      ),
      tone: "is-warning",
    },
    {
      label: "Issued",
      value: selectedCardCreated,
      tone: "",
    },
  ];

  const showComingSoon = (title) => {
    Swal.fire({
      icon: "info",
      title,
      text: "This action UI is ready. Backend action will be connected next.",
      timer: 2400,
      showConfirmButton: false,
    });
  };

  const [closeLoading, setCloseLoading] = useState(false);

  /* ── Bind card ── */
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState("");
  const [bindForm, setBindForm] = useState({
    active_code: "",
    card_number: "",
    address: "",
    country_area: "",
    city: "",
    post_code: "",
    dial_code: "",
    phone_number: "",
    email: "",
  });

  const openBindModal = () => {
    const rawPhone = String(user?.phone || "").replace(/\D/g, "");
    let dialCode = "971";
    let phoneNumber = rawPhone;
    if (rawPhone.startsWith("971") && rawPhone.length > 3) {
      phoneNumber = rawPhone.slice(3);
    }
    setBindForm({
      active_code: "",
      card_number: "",
      address: "",
      country_area: "",
      city: "",
      post_code: "",
      dial_code: dialCode,
      phone_number: phoneNumber,
      email: String(user?.email || ""),
    });
    setBindError("");
    setBindModalOpen(true);
  };

  const handleBindFormChange = (e) => {
    const { name, value } = e.target;
    setBindForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBindSubmit = async (e) => {
    e.preventDefault();
    const cardId = getCardIdentity(selectedCard);
    if (!cardId) return;

    const required = ["active_code", "card_number", "address", "country_area", "city", "post_code", "dial_code", "phone_number", "email"];
    for (const field of required) {
      if (!String(bindForm[field] || "").trim()) {
        setBindError(`${field.replace(/_/g, " ")} is required.`);
        return;
      }
    }

    try {
      setBindLoading(true);
      setBindError("");

      const fd = new FormData();
      required.forEach((field) => fd.append(field, String(bindForm[field]).trim()));

      await request({
        url: `app/tevau/cards/${cardId}/bind`,
        method: "POST",
        data: fd,
      });

      setBindModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Card Bound",
        text: "Your card has been successfully bound and activated.",
        timer: 2400,
        showConfirmButton: false,
      });
      await loadCards();
    } catch (err) {
      const d = err?.response?.data || {};
      const firstError = d.errors ? Object.values(d.errors).flat().find(Boolean) : null;
      setBindError(String(firstError || d.message || d.error || err?.message || "Bind failed. Please try again."));
    } finally {
      setBindLoading(false);
    }
  };

  const loadCardLimits = useCallback(async () => {
    const cardId = getCardIdentity(selectedCard);
    if (!cardId) {
      setCardLimits(createEmptyCardLimits());
      return;
    }

    try {
      setLimitsLoading(true);
      setLimitsError("");

      const limits = await getCardTransactionLimits(cardId);
      setCardLimits(limits);
    } catch (loadError) {
      setCardLimits(createEmptyCardLimits());
      setLimitsError(
        getApiErrorMessage(loadError, "Failed to load card limits."),
      );
    } finally {
      setLimitsLoading(false);
    }
  }, [selectedCard]);

  const handleOpenLimitsModal = () => {
    setLimitsModalOpen(true);
  };

  const handleCloseLimitsModal = () => {
    setLimitsModalOpen(false);
  };

  const handleOpenPinModal = () => {
    setPinModalOpen(true);
  };

  const handleClosePinModal = () => {
    setPinModalOpen(false);
  };

  useEffect(() => {
    if (!limitsModalOpen) return;
    loadCardLimits().catch(() => undefined);
  }, [limitsModalOpen, loadCardLimits]);

  const handleFreezeCard = async () => {
    const cardId = getCardIdentity(selectedCard);
    const tevauCardId = getTevauCardId(selectedCard);

    if (!cardId || freezeLoading) return;

    const isCurrentlyFrozen = freezeEnabled;
    const actionLabel = isCurrentlyFrozen ? "unfreeze" : "freeze";
    const resultLabel = isCurrentlyFrozen ? "unfrozen" : "frozen";

    if (!tevauCardId) {
      Swal.fire({
        icon: "error",
        title: `${isCurrentlyFrozen ? "Unfreeze" : "Freeze"} Failed`,
        text: "The  nova card identifier is missing. Refresh the card list and try again.",
      });
      return;
    }

    try {
      setFreezeLoading(true);

      await request({
        url: `app/tevau/cards/${encodeURIComponent(cardId)}/${actionLabel}`,
        method: "POST",
        data: {
          cardId: tevauCardId,
        },
      });

      setFreezeEnabled((prev) => !prev);

      Swal.fire({
        icon: "success",
        title: `Card ${isCurrentlyFrozen ? "Unfrozen" : "Frozen"}`,
        text: `The card has been successfully ${resultLabel}.`,
        timer: 2200,
        showConfirmButton: false,
      });

      await loadCards();
    } catch (error) {
      const d = error?.response?.data || {};
      const firstError = d.errors ? Object.values(d.errors).flat().find(Boolean) : null;
      const msg = String(firstError || d.message || d.error || error?.message || "Please try again.").trim();
      Swal.fire({
        icon: "error",
        title: `${isCurrentlyFrozen ? "Unfreeze" : "Freeze"} Failed`,
        text: msg,
      });
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleCloseCard = async () => {
    const cardId = getCardIdentity(selectedCard);

    if (!cardId) {
      Swal.fire({
        icon: "error",
        title: "Card Not Found",
        text: "Unable to find the selected card. Please refresh and try again.",
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Close this card?",
      html: `
        <div class="text-start">
          <p class="fw-semibold mb-2">Attention:</p>
          <ol class="mb-0 ps-3">
            <li class="mb-2">The operation of closing the card is irreversible.</li>
            <li class="mb-2">A handling fee of 2 USD will be charged for closing the card.</li>
            <li class="mb-0">Please note that before closing the card, the card balance should be kept at 2 USD to pay the fee, otherwise the card will fail to be closed.</li>
          </ol>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, close it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!confirmation.isConfirmed) return;

    await closeCard(cardId);
  };

  const closeCard = async (card_id) => {
    try {
      setCloseLoading(true);
      await request({
        url: `app/tevau/cards/${card_id}/destroy`,
      });

      Swal.fire({
        icon: "success",
        title: "Card Closed",
        text: "The card has been successfully closed.",
        timer: 2400,
        showConfirmButton: false,
      });

      await loadCards();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Close Card Failed",
        text: "An error occurred while attempting to close the card. Please try again later.",
      });
    } finally {
      setCloseLoading(false);
    }
  };

  const managementSections = useMemo(() => {
    const securityItems = [
      {
        icon: "pi pi-credit-card",
        title: "Card Number & CVV",
        subtitle: "Reveal protected card details securely.",
        actionLabel: "View",
        tone: "default",
        onClick: () => showComingSoon("Card Number & CVV"),
      },
      {
        icon: "pi pi-key",
        title: "PIN / ATM Withdrawal Password",
        subtitle: "View or manage withdrawal credentials.",
        actionLabel: "Manage",
        tone: "default",
        onClick: handleOpenPinModal,
      },
    ];

    if (!selectedCardIsBound) {
      securityItems.push({
        icon: "pi pi-link",
        title: "Bind / Activate Card",
        subtitle: "Link your card using activation code and billing details.",
        actionLabel: "Bind",
        tone: "default",
        onClick: openBindModal,
      });
    }

    return [
      {
        title: "Security",
        description: "Sensitive card details and ATM credentials.",
        items: securityItems,
      },
      {
        title: "Controls",
        description: "Daily card controls and spending preferences.",
        items: [
          {
            icon: "pi pi-lock",
            title: "Freeze Card",
            subtitle: "Temporarily block transactions on this card.",
            type: "toggle",
            onClick: handleFreezeCard,
          },
          {
            icon: "pi pi-sliders-h",
            title: "Limits",
            subtitle: "Review and adjust daily and transaction limits.",
            actionLabel: "Open",
            tone: "default",
            onClick: handleOpenLimitsModal,
          },
        ],
      },
      {
        title: "Closure",
        description: "Permanent actions for this card.",
        items: [
          {
            icon: "pi pi-times",
            title: "Close Card",
            subtitle: "Permanently close this card and disable future use.",
            actionLabel: "Close",
            tone: "danger",
            onClick: handleCloseCard,
          },
        ],
      },
    ];
  }, [selectedCardIsBound]);
  
  return (
    <>
      <PageTitle motherMenu="Cards" motherMenuPath="/cards" activeMenu="Card Management" />

      {loading ? (
        <div className="card nova-panel">
          <div className="card-body d-flex align-items-center gap-2 text-muted">
            <span className="spinner-border spinner-border-sm" />
            Loading card management...
          </div>
        </div>
      ) : cards.length == 0 ? (
        <CardAccessNotice
          title="Card Management Unavailable"
          message="At least one purchased card is required before card management actions can be used."
        />
      ) : (
        <div className="row g-3">
          {cards.length > 1 && (
            <div className="col-12">
              <div className="nova-cm-selector-v2">
                <div className="nova-cm-selector-header">
                  <div className="nova-cm-selector-header-left">
                    <span className="nova-cm-selector-label">Select Card</span>
                    <span className="nova-cm-selector-count">{cards.length} cards</span>
                  </div>
                  <div className="nova-cm-selector-nav">
                    <button
                      type="button"
                      aria-label="Previous"
                      onClick={() => cardSwiperRef.current?.slidePrev()}
                    >
                      <i className="pi pi-chevron-left" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next"
                      onClick={() => cardSwiperRef.current?.slideNext()}
                    >
                      <i className="pi pi-chevron-right" />
                    </button>
                  </div>
                </div>

                <Swiper
                  onSwiper={(swiper) => { cardSwiperRef.current = swiper; }}
                  slidesPerView="auto"
                  spaceBetween={10}
                  slidesPerGroup={1}
                  className="nova-cm-swiper"
                >
                  {cards.map((card, index) => {
                    const cid = getCardIdentity(card);
                    const ctype = normalizeCardType(card?.card_type || card?.type);
                    const isSelected = cid === selectedCardId;
                    const isCardActive = ["active", "normal"].includes(String(card?.status || "").toLowerCase());
                    return (
                      <SwiperSlide key={cid} className="nova-cm-swiper-slide">
                        <button
                          type="button"
                          className={`nova-cm-card-tile ${isSelected ? "is-selected" : ""} ${ctype === "Virtual" ? "is-virtual" : "is-physical"}`}
                          onClick={() => setSelectedCardId(cid)}
                        >
                          <div className="nova-cm-card-tile-icon">
                            <i className={`pi ${ctype === "Virtual" ? "pi-mobile" : "pi-credit-card"}`} />
                          </div>
                          <div className="nova-cm-card-tile-info">
                            <strong>{getCardName(card, index)}</strong>
                            <span>{maskCardLast4(card)}</span>
                          </div>
                          <div className="nova-cm-card-tile-meta">
                            <span className={`nova-cm-tile-type ${ctype === "Virtual" ? "is-virtual" : "is-physical"}`}>{ctype}</span>
                            <span className={`nova-cm-tile-dot ${isCardActive ? "is-on" : ""}`} title={isCardActive ? "Active" : "Inactive"} />
                          </div>
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </div>
          )}

          {/* ── Hero banner ── */}
          <div className="col-12">
            <div className="nova-cm-hero">
              <div className="nova-cm-hero-body">
                <div className="nova-flow-kicker mb-1">Card Management</div>
                <h4 className="mb-2">{selectedCardName}</h4>
                <div className="nova-cm-hero-meta">
                  <span
                    className={`nova-cm-status-badge ${String(selectedCard?.status || "").toLowerCase() === "active" ? "is-active" : "is-neutral"}`}
                  >
                    {selectedCardStatus}
                  </span>
                  <span className="nova-cm-type-badge">
                    <i
                      className={`pi ${selectedCardType === "Virtual" ? "pi-mobile" : "pi-credit-card"}`}
                    />
                    {selectedCardType}
                  </span>
                  <span className="nova-cm-hero-number">
                    {maskCardLast4(selectedCard)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="nova-cm-refresh-btn"
                onClick={() => {
                  loadCards().catch(() => undefined);
                  loadWallet().catch(() => undefined);
                }}
              >
                <i className="pi pi-refresh" />
                <span>Refresh</span>
              </button>
            </div>
            {error ? (
              <div className="alert alert-warning py-2 mt-2 mb-0">{error}</div>
            ) : null}
          </div>

          {/* ── Card overview: visual + stats unified ── */}
          <div className="col-12">
            <div className="card nova-panel">
              <div className="card-body">
                <div className="row g-3 align-items-stretch">

                  {/* Card mock — col-5 */}
                  <div className="col-xl-5 col-lg-5">
                    <div className={`nova-cm-card-mock h-100 ${selectedCardType === "Virtual" ? "is-virtual" : "is-physical"}`}>
                      <div className="nova-cm-card-mock-top">
                        <span className="nova-cm-card-mock-name">{selectedCardName}</span>
                        <span className={`nova-cm-card-mock-status ${String(selectedCard?.status || "").toLowerCase() === "active" ? "is-active" : "is-other"}`}>
                          {selectedCardStatus}
                        </span>
                      </div>
                      <div className="nova-cm-card-mock-chip" />
                      <div className="nova-cm-card-mock-number">{maskCardLast4(selectedCard)}</div>
                      <div className="nova-cm-card-mock-footer">
                        <div className="nova-cm-card-mock-field">
                          <span>Balance</span>
                          <strong>{formatMoney(selectedCardBalance, selectedCardCurrency)}</strong>
                        </div>
                        <div className="nova-cm-card-mock-field">
                          <span>Issued</span>
                          <strong>{selectedCardCreated}</strong>
                        </div>
                        <div className="nova-cm-card-mock-type">
                          <i className={`pi ${selectedCardType === "Virtual" ? "pi-mobile" : "pi-credit-card"}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats — col-7 */}
                  <div className="col-xl-7 col-lg-7">
                    <p className="nova-flow-kicker mb-3">Card Overview</p>
                    <div className="nova-cm-stat-grid">
                      <div className={`nova-cm-stat-item is-status`}>
                        <div className="nova-cm-stat-icon">
                          <i className="pi pi-shield-check" />
                        </div>
                        <span>Card Status</span>
                        <strong>{selectedCardStatus}</strong>
                      </div>
                      <div className="nova-cm-stat-item is-balance">
                        <div className="nova-cm-stat-icon">
                          <i className="pi pi-credit-card" />
                        </div>
                        <span>Card Balance</span>
                        <strong>{formatMoney(selectedCardBalance, selectedCardCurrency)}</strong>
                      </div>
                      <div className="nova-cm-stat-item is-wallet">
                        <div className="nova-cm-stat-icon">
                          <i className="pi pi-wallet" />
                        </div>
                        <span>Wallet Available</span>
                        <strong>{formatMoney(walletSummary.availableBalance ?? walletSummary.balance ?? 0, walletSummary.currency)}</strong>
                      </div>
                      <div className="nova-cm-stat-item is-date">
                        <div className="nova-cm-stat-icon">
                          <i className="pi pi-calendar" />
                        </div>
                        <span>Issued</span>
                        <strong>{selectedCardCreated}</strong>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ── Management sections — single unified card ── */}
          <div className="col-12">
            <div className="card nova-panel">
                  <div className="card-body">
                    <div className="nova-cm-sections-grid">
                      {managementSections.map((section, sIdx) => (
                        <div
                          key={section.title}
                          className={`nova-cm-section-col${sIdx > 0 ? " has-divider" : ""}`}
                        >
                          <div className="nova-cm-section-head">
                            <div className="nova-cm-section-icon">
                              <i
                                className={
                                  section.title === "Security"
                                    ? "pi pi-shield"
                                    : section.title === "Controls"
                                      ? "pi pi-sliders-h"
                                      : "pi pi-times-circle"
                                }
                              />
                            </div>
                            <div>
                              <h6 className="nova-cm-section-title">
                                {section.title}
                              </h6>
                              <p className="nova-cm-section-desc">
                                {section.description}
                              </p>
                            </div>
                          </div>

                          <div className="nova-cm-action-list">
                            {section.items.map((item) => (
                              <div
                                className={`nova-cm-action-row ${item.tone === "danger" ? "is-danger" : ""}`.trim()}
                                key={item.title}
                              >
                                <div className="nova-cm-action-icon">
                                  <i className={item.icon} />
                                </div>
                                <div className="nova-cm-action-copy">
                                  <strong>{item.title}</strong>
                                  <span>{item.subtitle}</span>
                                </div>
                                <div className="nova-cm-action-ctrl">
                                  {item.type === "toggle" ? (
                                    <button
                                      type="button"
                                      className={`nova-2fa-switch ${freezeEnabled ? "is-on" : ""}`}
                                      onClick={item.onClick}
                                      disabled={freezeLoading}
                                      aria-label="Toggle freeze card"
                                    >
                                      <span />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className={`btn btn-sm ${item.tone === "danger" ? "btn-outline-danger" : "btn-outline-primary"}`}
                                      disabled={
                                        (item.title === "Close Card" && closeLoading) ||
                                        (item.title === "Limits" && limitsLoading) ||
                                        (item.title === "Bind / Activate Card" && bindLoading)
                                      }
                                      onClick={item.onClick}
                                    >
                                      {item.title === "Close Card" && closeLoading
                                        ? "Closing..."
                                        : item.title === "Limits" && limitsLoading
                                          ? "Loading..."
                                          : item.title === "Bind / Activate Card" && bindLoading
                                            ? "Binding..."
                                            : item.actionLabel}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        show={limitsModalOpen}
        onHide={handleCloseLimitsModal}
        centered
        size="lg"
      >
        <div className="modal-content nova-card-limits-panel">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-1">Transaction limits</h5>
              <div className="text-muted small">
                {selectedCardName} ({maskCardLast4(selectedCard)})
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={handleCloseLimitsModal}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <div className="nova-card-limits-head">
              <span className="nova-flow-kicker">Limits</span>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  loadCardLimits().catch(() => undefined);
                }}
                disabled={limitsLoading}
              >
                {limitsLoading ? "Refreshing..." : "Refresh Limits"}
              </button>
            </div>

            {limitsLoading ? (
              <div className="nova-card-limits-state">Loading limits...</div>
            ) : limitsError ? (
              <div className="alert alert-warning py-2 mt-3 mb-0">
                {limitsError}
              </div>
            ) : (
              <div className="row g-3 mt-1">
                {LIMITS_SECTION_CONFIG.map((group) => (
                  <div className="col-md-6" key={group.key}>
                    <div className="nova-card-limits-group">
                      <div className="nova-card-limits-group-head">
                        <h6>{group.title}</h6>
                        <i className={group.icon} />
                      </div>

                      <div className="nova-card-limits-table">
                        {LIMITS_ROW_CONFIG.filter((row) => {
                          const rowValue = cardLimits[group.key]?.[row.key];
                          return !row.optional || hasValue(rowValue);
                        }).map((row) => {
                          const rowValue = cardLimits[group.key]?.[row.key];
                          return (
                            <div
                              className="nova-card-limits-row"
                              key={row.label}
                            >
                              <span>{row.label}</span>
                              <strong>{formatLimitValue(rowValue)}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <CardPinModal
        show={pinModalOpen}
        onHide={handleClosePinModal}
        cardId={getCardIdentity(selectedCard)}
        cardName={selectedCardName}
        cardMasked={maskCardLast4(selectedCard)}
      />

      {/* ── Bind Card Modal ── */}
      <Modal
        show={bindModalOpen}
        onHide={() => !bindLoading && setBindModalOpen(false)}
        centered
        size="lg"
      >
        <form onSubmit={handleBindSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-1">Bind / Activate Card</h5>
                <div className="text-muted small">
                  {selectedCardName} ({maskCardLast4(selectedCard)})
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => !bindLoading && setBindModalOpen(false)}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              {bindError && (
                <div className="alert alert-danger py-2 mb-3">{bindError}</div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Activation Code <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="active_code"
                    value={bindForm.active_code}
                    onChange={handleBindFormChange}
                    placeholder="e.g. 440728"
                    autoComplete="off"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Card Last 4 Digits <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="card_number"
                    value={bindForm.card_number}
                    onChange={handleBindFormChange}
                    placeholder="e.g. 9018"
                    maxLength={4}
                    autoComplete="off"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Address <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="address"
                    value={bindForm.address}
                    onChange={handleBindFormChange}
                    placeholder="Full billing address"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Country Code <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="country_area"
                    value={bindForm.country_area}
                    onChange={handleBindFormChange}
                    placeholder="e.g. HK"
                    maxLength={3}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">City <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="city"
                    value={bindForm.city}
                    onChange={handleBindFormChange}
                    placeholder="e.g. HongKong"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Post Code <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="post_code"
                    value={bindForm.post_code}
                    onChange={handleBindFormChange}
                    placeholder="e.g. 123456"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Dial Code <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text">+</span>
                    <input
                      className="form-control"
                      name="dial_code"
                      value={bindForm.dial_code}
                      onChange={handleBindFormChange}
                      placeholder="971"
                      maxLength={5}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Phone Number <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="phone_number"
                    value={bindForm.phone_number}
                    onChange={handleBindFormChange}
                    placeholder="581231234"
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={bindForm.email}
                    onChange={handleBindFormChange}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setBindModalOpen(false)}
                disabled={bindLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={bindLoading}
              >
                {bindLoading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Binding...</>
                ) : (
                  "Bind Card"
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default CardManagement;
