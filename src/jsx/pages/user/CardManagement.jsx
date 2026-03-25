import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import PageTitle from "../../layouts/PageTitle";
import CardAccessNotice from "../../components/CardAccessNotice";
import { AuthContext } from "../../../context/authContext";
import {
  formatMoney,
  maskCardLast4,
  normalizeCardType,
  normalizeStatus,
  toSafeNumber,
} from "../../../utils";
import {
  getAllDashboardCards,
  getDashboardWalletBalance,
} from "../../../services/dashboardWallet";

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
  String(card?.currency || card?.tevau_response?.cardCurrency || "USD").toUpperCase();

const getCardBalance = (card) =>
  toSafeNumber(card?.balance ?? card?.tevau_response?.cardBalance) ?? 0;

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
      const data = await getDashboardWalletBalance({ userId, userCode, thirdId });
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      const bestAsset =
        [...assets].sort((a, b) => {
          const aValue = Number(a?.available_balance ?? a?.balance ?? 0) || 0;
          const bValue = Number(b?.available_balance ?? b?.balance ?? 0) || 0;
          return bValue - aValue;
        })[0] || null;

      setWalletSummary({
        balance: bestAsset?.balance ?? null,
        availableBalance: bestAsset?.available_balance ?? bestAsset?.balance ?? null,
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
    const found = cards.find((card) => getCardIdentity(card) === selectedCardId);
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
          onClick: () => showComingSoon("PIN / ATM Withdrawal Password"),
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
        },
        {
          icon: "pi pi-sliders-h",
          title: "Limits",
          subtitle: "Review and adjust daily and transaction limits.",
          actionLabel: "Open",
          tone: "default",
          onClick: () => showComingSoon("Limits"),
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
          onClick: () => showComingSoon("Close Card"),
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
                      Review card identity, control access, and manage operational actions from one place.
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
                  <div className="alert alert-warning py-2 mt-3 mb-0">{error}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card nova-panel h-100">
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Select Card</label>
                  <select
                    className="form-select"
                    value={getCardIdentity(selectedCard)}
                    onChange={(event) => setSelectedCardId(event.target.value)}
                    disabled={loading || !cards.length}
                  >
                    {cards.map((card, index) => (
                      <option key={getCardIdentity(card)} value={getCardIdentity(card)}>
                        {`${getCardName(card, index)} - ${maskCardLast4(card)}`}
                      </option>
                    ))}
                  </select>
                </div>

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
                      <strong>{formatMoney(selectedCardBalance, selectedCardCurrency)}</strong>
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
                            onClick={() => setFreezeEnabled((prev) => !prev)}
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
                            onClick={item.onClick}
                          >
                            {item.actionLabel}
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
    </>
  );
};

export default CardManagement;
