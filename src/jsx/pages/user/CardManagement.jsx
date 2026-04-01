import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Modal } from "react-bootstrap";
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

  const userId = user?.id;
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;

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

    if (!cardId || freezeLoading) return;

    const isCurrentlyFrozen = freezeEnabled;
    const actionLabel = isCurrentlyFrozen ? "unfreeze" : "freeze";
    const resultLabel = isCurrentlyFrozen ? "unfrozen" : "frozen";

    try {
      setFreezeLoading(true);

      await request({
        url: `app/tevau/cards/${cardId}/${actionLabel}`,
        method: "POST",
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
      Swal.fire({
        icon: "error",
        title: `${isCurrentlyFrozen ? "Unfreeze" : "Freeze"} Failed`,
        text: `An error occurred while trying to ${actionLabel} the card. Please try again later.`,
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

  const managementSections = [
    {
      title: "Security",
      description: "Sensitive card details and ATM credentials.",
      items: [
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
      ],
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

  return (
    <>
      <PageTitle motherMenu="Card" activeMenu="Card Management" />

      {loading ? (
        <div className="card nova-panel">
          <div className="card-body">
            <div className="text-muted">Loading card management...</div>
          </div>
        </div>
      ) : !cards.length ? (
        <CardAccessNotice
          title="Card Management Unavailable"
          message="At least one purchased card is required before card management actions can be used."
        />
      ) : (
        <div className="row g-3">
          <div className="col-12">
            <div className="card nova-panel nova-card-management-shell">
              <div className="card-body">
                <div className="nova-card-management-hero">
                  <div>
                    <div className="nova-flow-kicker mb-1">Card Management</div>
                    <h4 className="mb-1">Manage your card settings</h4>
                    <p className="text-muted mb-0">
                      Review card identity, control access, and manage
                      operational actions from one place.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => {
                      loadCards().catch(() => undefined);
                      loadWallet().catch(() => undefined);
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {error ? (
                  <div className="alert alert-warning py-2 mt-3 mb-0">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card nova-panel h-100">
              <div className="card-body">
                <div className="nova-card-management-summary">
                  <div className="nova-card-management-summary-head">
                    <div>
                      <span className="nova-card-management-summary-label">
                        {selectedCardName}
                      </span>
                      <h4>{maskCardLast4(selectedCard)}</h4>
                    </div>
                    <span className="badge bg-light text-dark border">
                      {selectedCardType}
                    </span>
                  </div>

                  <div className="nova-card-management-summary-grid">
                    <div className="nova-card-management-summary-item">
                      <span>Currency</span>
                      <strong>{selectedCardCurrency}</strong>
                    </div>
                    <div className="nova-card-management-summary-item">
                      <span>Status</span>
                      <strong>{selectedCardStatus}</strong>
                    </div>
                    <div className="nova-card-management-summary-item">
                      <span>Balance</span>
                      <strong>
                        {formatMoney(selectedCardBalance, selectedCardCurrency)}
                      </strong>
                    </div>
                    <div className="nova-card-management-summary-item">
                      <span>Created</span>
                      <strong>{selectedCardCreated}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-8">
            <div className="card nova-panel h-100">
              <div className="card-body">
                <div className="nova-settings-quick-grid">
                  {quickStats.map((item) => (
                    <div
                      key={item.label}
                      className={`nova-settings-quick-card ${item.tone}`.trim()}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {managementSections.map((section) => (
            <div className="col-xl-6" key={section.title}>
              <div className="card nova-panel h-100 nova-card-management-section">
                <div className="card-body">
                  <div className="nova-card-management-section-head">
                    <h5 className="mb-1">{section.title}</h5>
                    <p className="text-muted mb-0">{section.description}</p>
                  </div>

                  <div className="nova-card-management-list">
                    {section.items.map((item) => (
                      <div
                        className={`nova-card-management-row ${
                          item.tone === "danger" ? "is-danger" : ""
                        }`.trim()}
                        key={item.title}
                      >
                        <div className="nova-card-management-row-icon">
                          <i className={item.icon} />
                        </div>
                        <div className="nova-card-management-row-copy">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>

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
                            className={`btn ${
                              item.tone === "danger"
                                ? "btn-outline-danger"
                                : "btn-outline-primary"
                            } btn-sm`}
                            disabled={
                              (item.title === "Close Card" && closeLoading) ||
                              (item.title === "Limits" && limitsLoading)
                            }
                            onClick={item.onClick}
                          >
                            {item.title === "Close Card" && closeLoading
                              ? "Closing..."
                              : item.title === "Limits" && limitsLoading
                                ? "Loading..."
                                : item.actionLabel}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

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
                            <div className="nova-card-limits-row" key={row.label}>
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
    </>
  );
};

export default CardManagement;
