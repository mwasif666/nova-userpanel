import React, { useEffect, useMemo, useState } from "react";
import virtualCardImage from "../../../assets/images/virtual_card.jpeg";
import physicalCardImage from "../../../assets/images/nova_card.png";
import virtualCardBackImage from "../../../assets/images/virtual_card_back.jpeg";
import physicalCardBackImage from "../../../assets/images/physical_card_back.jpeg";

const normalizeCardType = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("physical")) return "Physical";
  return "Card";
};

const getCardImages = (cardType) => {
  const type = normalizeCardType(cardType);
  return type === "Physical"
    ? { front: physicalCardImage, back: physicalCardBackImage }
    : { front: virtualCardImage, back: virtualCardBackImage };
};

const getCvv = (card) => {
  const raw = String(card?.cvv || card?.card_cvv || card?.cvc || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "***";
  return digits.slice(-3).padStart(3, "*");
};

const formatBalance = (value, currency = "USD") => {
  const number = Number(value || 0);
  const safe = Number.isNaN(number) ? 0 : number;
  const safeCurrency = String(currency || "USD").toUpperCase();

  try {
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    return `${safeCurrency} ${safe.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const formatExpiry = (card) => {
  const direct =
    card?.valid_thru || card?.expiry || card?.exp_date || card?.expiry_date;
  if (direct) return String(direct);

  const dateValue = card?.expired_at || card?.expires_at || card?.bound_at;
  if (!dateValue) return "--/--";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--/--";

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

const formatCardDigits = (digits) =>
  digits.match(/.{1,4}/g)?.join(" ") || "**** **** **** ****";

const buildPseudoDigits = (card, fallback = "0000") => {
  const seed = String(
    card?.card_id || card?.id || card?.user_code || card?.third_id || fallback,
  ).replace(/\D/g, "");
  const padded = (seed + "174426843901").slice(-16);
  return formatCardDigits(padded);
};

const resolveCardNumber = (card) => {
  const raw = String(
    card?.card_number || card?.masked_card_number || card?.card_no || card?.number || "",
  ).trim();

  if (!raw) return buildPseudoDigits(card);
  if (raw.includes("*")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return buildPseudoDigits(card);

  if (digits.length >= 16) {
    return formatCardDigits(digits.slice(0, 16));
  }

  return formatCardDigits((digits + "0000000000000000").slice(0, 16));
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const MainBalanceCard = ({
  cards = [],
  userName = "Card Holder",
  loading = false,
  onCardChange = null,
  walletAsset = null,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fallbackCard = useMemo(
    () => ({
      displayId: "N/A",
      displayName: "Nova Card",
      displayType: "Virtual",
      displayNumber: "**** **** **** ****",
      displayExpiry: "--/--",
      displayCurrency: "USD",
      displayBalance: "$0.00",
      displayCvv: "***",
      displayStatus: "inactive",
      themeClass: "is-virtual",
      images: {
        front: virtualCardImage,
        back: virtualCardBackImage,
      },
    }),
    [],
  );

  const normalizedCards = useMemo(
    () =>
      cards.map((card, index) => {
        const displayType = normalizeCardType(card?.card_type);
        const themeClass = displayType === "Physical" ? "is-physical" : "is-virtual";
        const images = getCardImages(displayType);

        return {
          ...card,
          displayId: card?.card_id || card?.id || `CARD-${index + 1}`,
          displayName:
            card?.card_name || card?.name || `${displayType} Card ${index + 1}`,
          displayType,
          displayNumber: resolveCardNumber(card),
          displayExpiry: formatExpiry(card),
          displayCurrency: card?.currency || "USD",
          displayBalance: formatBalance(card?.balance, card?.currency || "USD"),
          displayCvv: getCvv(card),
          displayStatus: String(card?.status || "active"),
          themeClass,
          images,
        };
      }),
    [cards],
  );

  const availableCards = useMemo(
    () => (normalizedCards.length ? normalizedCards : [fallbackCard]),
    [normalizedCards, fallbackCard],
  );

  useEffect(() => {
    if (!availableCards.length) {
      setSelectedIndex(0);
      return;
    }

    if (selectedIndex > availableCards.length - 1) {
      setSelectedIndex(0);
    }
  }, [availableCards, selectedIndex]);

  const safeIndex = Math.min(selectedIndex, availableCards.length - 1);
  const selectedCard = availableCards[safeIndex] || fallbackCard;

  useEffect(() => {
    if (typeof onCardChange === "function") {
      onCardChange(selectedCard);
    }
  }, [onCardChange, selectedCard]);

  const stackCards = useMemo(() => {
    const depth = Math.min(5, availableCards.length);
    return Array.from({ length: depth }, (_, layer) => {
      const index = (safeIndex + layer) % availableCards.length;
      return {
        layer,
        index,
        card: availableCards[index],
      };
    });
  }, [availableCards, safeIndex]);

  const onPrev = () => {
    setSelectedIndex((prev) =>
      prev <= 0 ? availableCards.length - 1 : prev - 1,
    );
  };

  const onNext = () => {
    setSelectedIndex((prev) => (prev + 1) % availableCards.length);
  };

  const showNoCards = !loading && normalizedCards.length === 0;
  const walletCurrency = String(
    walletAsset?.currency || selectedCard.displayCurrency || "USD",
  ).toUpperCase();
  const walletBalance = formatBalance(
    walletAsset?.balance ?? 0,
    walletCurrency,
  );
  const walletAvailable = formatBalance(
    walletAsset?.available_balance ?? 0,
    walletCurrency,
  );
  const walletLocked = formatBalance(
    walletAsset?.locked_balance ?? 0,
    walletCurrency,
  );
  const detailRows = [
    { label: "Card ID", value: selectedCard.displayId },
    { label: "Card Type", value: selectedCard.displayType },
    { label: "Currency", value: selectedCard.displayCurrency },
    { label: "Card Balance", value: selectedCard.displayBalance },
    { label: "Valid Thru", value: selectedCard.displayExpiry },
    { label: "Status", value: normalizeStatus(selectedCard.displayStatus) },
    { label: "User Code", value: selectedCard.user_code || "N/A" },
    { label: "Third ID", value: selectedCard.third_id || "N/A" },
    { label: "Bound At", value: formatDateTime(selectedCard.bound_at) },
  ];

  return (
    <div className="card dz-wallet nova-main-balance-card">
      <div className="card-header border-0 align-items-start pb-0">
        <div>
          <span className="fs-18 d-block mb-2">Main Balance</span>
          <h2 className="fs-28 font-w600">{selectedCard.displayBalance}</h2>
        </div>
        <div className="nova-card-controls">
          <button
            type="button"
            className="nova-card-nav-btn"
            onClick={onPrev}
            disabled={availableCards.length <= 1}
            aria-label="Previous card"
          >
            <i className="fa fa-chevron-left" />
          </button>
          <span className="nova-card-nav-count">
            {safeIndex + 1}/{availableCards.length}
          </span>
          <button
            type="button"
            className="nova-card-nav-btn"
            onClick={onNext}
            disabled={availableCards.length <= 1}
            aria-label="Next card"
          >
            <i className="fa fa-chevron-right" />
          </button>
        </div>
      </div>

      <div className="card-body py-3 pt-md-2">
        <div className="row g-3 nova-main-balance-bootstrap">
          <div className="col-xl-4 col-lg-4 col-12">
            <div className="nova-deck-layout">
              <div className="nova-deck-zone">
                <div className="nova-deck-stack">
                  {[...stackCards].reverse().map(({ layer, index, card }) => (
                    <button
                      key={`${card.displayId}-${layer}`}
                      type="button"
                      className={`nova-deck-layer ${card.themeClass} ${
                        layer === 0 ? "is-front" : ""
                      }`}
                      style={{ "--stack-depth": layer }}
                      onClick={() => setSelectedIndex(index)}
                      aria-label={`Show ${card.displayName}`}
                    >
                      {layer === 0 ? (
                        <div className="nova-flip-card">
                          <div className="nova-flip-inner">
                            <div
                              className={`nova-flip-face nova-flip-front ${card.themeClass}`}
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(10,26,46,0.58) 0%, rgba(12,22,38,0.22) 100%), url(${card.images.front})`,
                              }}
                            >
                              <div className="nova-card-head">
                                <span className="nova-card-chip" />
                              </div>
                              <div className="nova-card-name">{card.displayName}</div>
                              <div className="nova-card-number">{card.displayNumber}</div>
                              <div className="nova-card-foot">
                                <div>
                                  <span>VALID THRU</span>
                                  <strong>{card.displayExpiry}</strong>
                                </div>
                                <div>
                                  <span>CARD HOLDER</span>
                                  <strong>{userName}</strong>
                                </div>
                                <div>
                                  <span>STATUS</span>
                                  <strong className="text-capitalize">
                                    {card.displayStatus}
                                  </strong>
                                </div>
                              </div>
                              <div className="nova-card-id">ID: {card.displayId}</div>
                            </div>

                            <div
                              className={`nova-flip-face nova-flip-back ${card.themeClass}`}
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(8,16,29,0.72) 0%, rgba(16,22,35,0.48) 100%), url(${card.images.back})`,
                              }}
                            >
                              <div className="nova-card-stripe" />
                              <div className="nova-card-cvv-row">
                                <span>CVV</span>
                                <strong>{card.displayCvv}</strong>
                              </div>
                              <div className="nova-card-back-meta">
                                <span>{card.displayNumber}</span>
                                <span>{card.displayCurrency}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="nova-deck-shadow-card" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="nova-stack-hint">
                  {showNoCards
                    ? "No cards found"
                    : `${Math.max(availableCards.length - 1, 0)} cards behind`}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-12">
            <div className="nova-card-live-block h-100">
              <h5 className="nova-card-live-title">Card Details</h5>
              <div className="nova-card-live-grid">
                {detailRows.map((item) => (
                  <div className="nova-card-live-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value || "N/A"}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-12">
            <div className="nova-card-live-block h-100">
              <h5 className="nova-card-live-title">
                Wallet Asset ({walletCurrency})
              </h5>
              <div className="nova-card-live-grid">
                <div className="nova-card-live-item">
                  <span>Asset</span>
                  <strong>{walletAsset?.name || "N/A"}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Status</span>
                  <strong>{normalizeStatus(walletAsset?.status)}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Total Balance</span>
                  <strong>{walletBalance}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Available</span>
                  <strong>{walletAvailable}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Locked</span>
                  <strong>{walletLocked}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Coming Soon</span>
                  <strong>
                    {walletAsset
                      ? walletAsset.coming_soon
                        ? "Yes"
                        : "No"
                      : "N/A"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainBalanceCard;
