import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import virtualCardImage from "../../../assets/images/virtual_card.jpeg";
import physicalCardImage from "../../../assets/images/nova_card.png";
import virtualCardBackImage from "../../../assets/images/virtual_card_back.jpeg";
import physicalCardBackImage from "../../../assets/images/physical_card_back.jpeg";
import { request } from "../../../utils/api";
import {
  getSecurityCodeStatus,
  validateSecurityCode,
} from "../../../services/securityCode";

const CARD_NUMBER_PLACEHOLDER = "**** **** **** ****";
const CARD_EXPIRY_PLACEHOLDER = "**/**";
const CARD_CVV_PLACEHOLDER = "***";

const normalizeCardType = (value) => {
  if (value === 1 || value === "1") return "Physical";
  if (value === 2 || value === "2") return "Virtual";
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
  const raw = String(
    card?.cvv ||
      card?.card_cvv ||
      card?.cvc ||
      card?.pan_details?.cvv ||
      card?.pan_details?.cvc ||
      "",
  ).trim();
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

  const dateValue = card?.expired_at || card?.expires_at;
  if (!dateValue) return "--/--";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--/--";

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

const formatCardDigits = (digits) =>
  digits.match(/.{1,4}/g)?.join(" ") || CARD_NUMBER_PLACEHOLDER;

const formatMaskedLast4 = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(-4);
  return digits ? `**** **** **** ${digits}` : CARD_NUMBER_PLACEHOLDER;
};

const buildPseudoDigits = (card, fallback = "0000") => {
  const seed = String(
    card?.card_id || card?.id || card?.user_code || card?.third_id || fallback,
  ).replace(/\D/g, "");
  const padded = (seed + "174426843901").slice(-16);
  return formatCardDigits(padded);
};

const resolveCardNumber = (card) => {
  const candidates = [
    card?.pan_details?.card_number,
    card?.panDetails?.card_number,
    card?.card_number,
    card?.masked_card_number,
    card?.card_no,
    card?.number,
    card?.tevau_response?.maskedCardNumber,
    card?.tevau_response?.cardNumber,
    card?.tevau_response?.cardNo,
  ];

  const rawValue = candidates.find(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== "",
  );

  const raw = String(rawValue || "").trim();

  if (!raw) return buildPseudoDigits(card);
  if (raw.includes("*")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return buildPseudoDigits(card);

  if (digits.length >= 16) {
    return formatCardDigits(digits.slice(0, 16));
  }

  if (digits.length === 4) {
    return formatMaskedLast4(digits);
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

const normalizePanResponse = (response) => {
  const payload =
    response?.data && typeof response.data === "object" ? response.data : {};

  return {
    card_number: String(payload?.card_number || "").trim(),
    expiry_date: String(payload?.expiry_date || "").trim(),
    cvv: String(payload?.cvv || "").trim(),
  };
};

const formatPanErrorMessage = (message, code) => {
  const raw = String(message || "").trim();
  const errorCode = Number(code);

  if (errorCode === 2020079 || raw.includes("非冻结、锁定、激活状态")) {
    return "PAN details are not available for the current card status.";
  }

  return raw || "PAN details are not available for this card.";
};

const hasLocalCardNumberData = (card) =>
  [
    card?.pan_details?.card_number,
    card?.panDetails?.card_number,
    card?.card_number,
    card?.masked_card_number,
    card?.card_no,
    card?.number,
    card?.tevau_response?.maskedCardNumber,
    card?.tevau_response?.cardNumber,
    card?.tevau_response?.cardNo,
  ].some(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== "",
  );

const getPanEndpointCardId = (card) => {
  // Prefer the numeric internal `id` (works with backend PAN endpoint when present),
  // otherwise fall back to provider `card_id` like "CIDV...".
  const rawNumeric = card?.id;
  const parsed = Number(rawNumeric);
  if (Number.isInteger(parsed) && parsed > 0) return String(parsed);

  const raw = card?.card_id ?? "";
  if (!raw) return "";
  return String(raw);
};

const canAttemptPanApi = (card) => {
  const type = normalizeCardType(
    card?.displayType || card?.card_type || card?.type,
  );
  if (type !== "Virtual") return false;

  const status = String(
    card?.displayStatus || card?.display_status || card?.status || "",
  )
    .trim()
    .toLowerCase();

  if (!status) return true;

  // Provider PAN endpoint only supports cards in active/locked/frozen style states.
  return ["active", "activated", "frozen", "locked", "lock"].includes(status);
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
  const [panCacheByCardId, setPanCacheByCardId] = useState({});
  const [hasSecurityCode, setHasSecurityCode] = useState(false);
  const [securityStatusLoading, setSecurityStatusLoading] = useState(true);
  const [securityPromptOpen, setSecurityPromptOpen] = useState(false);
  const [securityCodeInput, setSecurityCodeInput] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [balanceUnlocked, setBalanceUnlocked] = useState(false);
  const [panUnlocked, setPanUnlocked] = useState(false);

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
        const displayType = normalizeCardType(
          card?.card_type ?? card?.type ?? card?.tevau_response?.cardType,
        );
        const themeClass =
          displayType === "Physical" ? "is-physical" : "is-virtual";
        const images = getCardImages(displayType);
        const displayCurrency =
          card?.currency || card?.tevau_response?.cardCurrency || "USD";
        const balanceValue =
          card?.balance ?? card?.tevau_response?.cardBalance ?? 0;

        return {
          ...card,
          displayId:
            card?.card_id ||
            card?.tevau_response?.cardId ||
            card?.id ||
            `CARD-${index + 1}`,
          displayName:
            card?.card_name || card?.name || `${displayType} Card ${index + 1}`,
          displayType,
          displayNumber: resolveCardNumber(card),
          displayExpiry: formatExpiry(card),
          displayCurrency,
          displayBalance: formatBalance(balanceValue, displayCurrency),
          displayCvv: getCvv(card),
          displayStatus: String(
            card?.display_status || card?.status || "active",
          ),
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
    let mounted = true;
    const loadSecurityStatus = async () => {
      setSecurityStatusLoading(true);
      try {
        const status = await getSecurityCodeStatus();
        if (!mounted) return;
        setHasSecurityCode(Boolean(status?.hasSecurityCode));
      } catch (error) {
        if (!mounted) return;
        setHasSecurityCode(false);
      } finally {
        if (mounted) {
          setSecurityStatusLoading(false);
        }
      }
    };

    loadSecurityStatus();
    return () => {
      mounted = false;
    };
  }, []);

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
  const selectedPanEndpointCardId = getPanEndpointCardId(selectedCard);
  const canAttemptSelectedCardPanApi = canAttemptPanApi(selectedCard);
  const canLoadPanWithSecurity = canAttemptSelectedCardPanApi && panUnlocked;

  useEffect(() => {
    if (!normalizedCards.length) return;
    if (!selectedPanEndpointCardId) return;
    if (!panUnlocked) return;
    if (!canAttemptSelectedCardPanApi) {
      setPanCacheByCardId((prev) => {
        if (
          Object.prototype.hasOwnProperty.call(prev, selectedPanEndpointCardId)
        ) {
          return prev;
        }
        return {
          ...prev,
          [selectedPanEndpointCardId]: {
            _errorMessage:
              normalizeCardType(
                selectedCard?.displayType || selectedCard?.card_type,
              ) === "Virtual"
                ? "PAN details are not available for the current card status."
                : "Expiry and CVV are shown for virtual cards only.",
          },
        };
      });
      return;
    }

    const cacheHasEntry = Object.prototype.hasOwnProperty.call(
      panCacheByCardId,
      selectedPanEndpointCardId,
    );
    if (cacheHasEntry) return;

    let cancelled = false;

    // Store a placeholder entry immediately to prevent duplicate requests.
    setPanCacheByCardId((prev) => ({
      ...prev,
      [selectedPanEndpointCardId]: { _loading: true },
    }));

    const fetchPan = async () => {
      try {
        const response = await request({
          url: `/tevau/cards/${encodeURIComponent(selectedPanEndpointCardId)}/pan`,
          method: "GET",
        });

        if (cancelled) return;

        if (
          !response?.status ||
          !response?.data ||
          typeof response.data !== "object"
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            "PAN fetch returned unexpected response",
            selectedPanEndpointCardId,
            response,
          );

          setPanCacheByCardId((prev) => ({
            ...prev,
            [selectedPanEndpointCardId]: {
              _errorMessage: formatPanErrorMessage(
                response?.error?.message || response?.message,
                response?.error?.code ?? response?.code,
              ),
            },
          }));
          return;
        }

        setPanCacheByCardId((prev) => ({
          ...prev,
          [selectedPanEndpointCardId]: normalizePanResponse(response),
        }));
      } catch (error) {
        if (cancelled) return;

        const errorPayload = error?.response?.data;
        // eslint-disable-next-line no-console
        console.warn(
          "PAN fetch failed",
          selectedPanEndpointCardId,
          error?.response || error,
        );

        // Cache an empty payload so UI shows placeholders instead of retry loops.
        setPanCacheByCardId((prev) => ({
          ...prev,
          [selectedPanEndpointCardId]: {
            _errorMessage: formatPanErrorMessage(
              errorPayload?.error?.message || errorPayload?.message,
              errorPayload?.error?.code ?? errorPayload?.code,
            ),
          },
        }));
      }
    };

    fetchPan();

    return () => {
      cancelled = true;
    };
    // Note: intentionally exclude `panCacheByCardId` from deps to avoid
    // re-running the effect when we update the cache state inside this effect.
    // The effect should run when the selected card or eligibility changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canAttemptSelectedCardPanApi,
    canLoadPanWithSecurity,
    normalizedCards.length,
    panUnlocked,
    selectedCard?.card_type,
    selectedCard?.displayType,
    selectedPanEndpointCardId,
  ]);

  const selectedPanData = selectedPanEndpointCardId
    ? panCacheByCardId[selectedPanEndpointCardId]
    : null;
  const isSelectedPanLoading =
    Boolean(selectedPanData?._loading) && canLoadPanWithSecurity;
  const selectedPanErrorMessage = String(
    selectedPanData?._errorMessage || "",
  ).trim();
  const panCardNumber = String(selectedPanData?.card_number || "").trim();
  const panExpiry = String(selectedPanData?.expiry_date || "").trim();
  const panCvv = String(selectedPanData?.cvv || "").trim();
  const localHasCardNumber = hasLocalCardNumberData(selectedCard);
  const isSelectedVirtualCard = selectedCard.displayType === "Virtual";
  const showPanLoaderOnSelectedCard =
    isSelectedVirtualCard &&
    panUnlocked &&
    isSelectedPanLoading &&
    !selectedPanErrorMessage;
  const shouldLoadSelectedCardNumber =
    showPanLoaderOnSelectedCard && !localHasCardNumber && !panCardNumber;
  const inlinePanLoadingNode = (
    <span className="nova-inline-loader" aria-live="polite">
      <span
        className="spinner-border spinner-border-sm"
        role="status"
        aria-hidden="true"
      />
      <span>Loading...</span>
    </span>
  );

  const resolvedSelectedCard = useMemo(() => {
    const isVirtualCard = selectedCard.displayType === "Virtual";
    const fallbackNumber = panUnlocked
      ? localHasCardNumber
        ? selectedCard.displayNumber || CARD_NUMBER_PLACEHOLDER
        : CARD_NUMBER_PLACEHOLDER
      : CARD_NUMBER_PLACEHOLDER;
    const fallbackExpiry = isVirtualCard
      ? selectedCard.displayExpiry && selectedCard.displayExpiry !== "--/--"
        ? selectedCard.displayExpiry
        : CARD_EXPIRY_PLACEHOLDER
      : CARD_EXPIRY_PLACEHOLDER;

    const finalNumber = panUnlocked && panCardNumber
      ? resolveCardNumber({
          ...selectedCard,
          pan_details: {
            ...(selectedCard?.pan_details || {}),
            card_number: panCardNumber,
          },
        })
      : fallbackNumber;

    // Only show PAN-provided expiry/cvv for virtual cards.
    const finalExpiry = isVirtualCard && panUnlocked
      ? panExpiry || fallbackExpiry || CARD_EXPIRY_PLACEHOLDER
      : CARD_EXPIRY_PLACEHOLDER;
    const finalCvv =
      isVirtualCard && panUnlocked && panCvv
        ? getCvv({ cvv: panCvv })
        : CARD_CVV_PLACEHOLDER;

    return {
      ...selectedCard,
      displayNumber: finalNumber,
      displayExpiry: finalExpiry,
      displayCvv: finalCvv,
    };
  }, [
    localHasCardNumber,
    panCardNumber,
    panCvv,
    panExpiry,
    panUnlocked,
    selectedCard,
  ]);

  useEffect(() => {
    if (typeof onCardChange === "function") {
      onCardChange(resolvedSelectedCard);
    }
  }, [onCardChange, resolvedSelectedCard]);

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
  const visibleMainBalance = balanceUnlocked
    ? resolvedSelectedCard.displayBalance
    : "****";
  const visibleCardBalance = balanceUnlocked
    ? resolvedSelectedCard.displayBalance
    : "****";
  const balanceToggleLabel = balanceUnlocked ? "Hide balance" : "Show balance";

  const openSecurityPrompt = () => {
    if (securityStatusLoading) return;
    setSecurityError(
      hasSecurityCode
        ? ""
        : "Security code is not configured. Please set it in Profile settings first.",
    );
    setSecurityCodeInput("");
    setSecurityPromptOpen(true);
  };

  const submitSecurityPrompt = async () => {
    if (!hasSecurityCode) {
      setSecurityError(
        "Security code is not configured. Please set it in Profile settings first.",
      );
      return;
    }
    if (!String(securityCodeInput || "").trim()) {
      setSecurityError("Please enter security code.");
      return;
    }
    setSecuritySubmitting(true);
    setSecurityError("");

    try {
      await validateSecurityCode({ securityCode: securityCodeInput });
      setBalanceUnlocked(true);
      setPanUnlocked(true);
      setSecurityPromptOpen(false);
      setSecurityCodeInput("");
    } catch (error) {
      setSecurityError(
        error?.response?.data?.message ||
          "Security code validation failed. Please try again.",
      );
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const toggleBalanceVisibility = () => {
    if (balanceUnlocked) {
      setBalanceUnlocked(false);
      setPanUnlocked(false);
      return;
    }
    openSecurityPrompt();
  };

  const detailRows = [
    { label: "Card ID", value: resolvedSelectedCard.displayId },
    {
      label: "Card Number",
      value: !panUnlocked
        ? CARD_NUMBER_PLACEHOLDER
        : shouldLoadSelectedCardNumber
        ? inlinePanLoadingNode
        : resolvedSelectedCard.displayNumber,
    },
    { label: "Card Type", value: resolvedSelectedCard.displayType },
    { label: "Currency", value: resolvedSelectedCard.displayCurrency },
    { label: "Card Balance", value: visibleCardBalance },
    {
      label: "Status",
      value: normalizeStatus(resolvedSelectedCard.displayStatus),
    },
    ...(isSelectedVirtualCard
      ? [
          {
            label: "Valid Thru",
            value: showPanLoaderOnSelectedCard
              ? inlinePanLoadingNode
              : panUnlocked
                ? resolvedSelectedCard.displayExpiry
                : CARD_EXPIRY_PLACEHOLDER,
          },
          {
            label: "CVV",
            value: showPanLoaderOnSelectedCard
              ? inlinePanLoadingNode
              : panUnlocked
                ? resolvedSelectedCard.displayCvv || CARD_CVV_PLACEHOLDER
                : CARD_CVV_PLACEHOLDER,
          },
        ]
      : []),
    ...(isSelectedVirtualCard && panUnlocked && selectedPanErrorMessage
        ? [
            {
              label: "PAN Info",
              value: selectedPanErrorMessage,
            },
          ]
        : []),
    {
      label: "Is Bound",
      value:
        typeof resolvedSelectedCard.is_bound === "boolean"
          ? resolvedSelectedCard.is_bound
            ? "Yes"
            : "No"
          : "N/A",
    },
    {
      label: "User Code",
      value:
        resolvedSelectedCard.user_code ||
        resolvedSelectedCard?.tevau_user?.user_code ||
        "N/A",
    },
    {
      label: "Third ID",
      value:
        resolvedSelectedCard.third_id ||
        resolvedSelectedCard?.tevau_user?.third_id ||
        "N/A",
    },
    { label: "Bound At", value: formatDateTime(resolvedSelectedCard.bound_at) },
    ...(resolvedSelectedCard?.frozen_at
      ? [
          {
            label: "Frozen At",
            value: formatDateTime(resolvedSelectedCard.frozen_at),
          },
        ]
      : []),
    ...(resolvedSelectedCard?.physical_delivery_status
      ? [
          {
            label: "Delivery",
            value: normalizeStatus(
              resolvedSelectedCard.physical_delivery_status,
            ),
          },
        ]
      : []),
    ...(resolvedSelectedCard?.created_at
      ? [
          {
            label: "Created At",
            value: formatDateTime(resolvedSelectedCard.created_at),
          },
        ]
      : []),
  ];

  return (
    <div className="card dz-wallet nova-main-balance-card">
      <div className="card-header border-0 align-items-start pb-0">
        <div>
          <span className="fs-18 d-block mb-2">Main Balance</span>
          <div className="nova-main-balance-head">
            <h2 className="fs-28 font-w600 mb-0">{visibleMainBalance}</h2>
            <button
              type="button"
              className={`nova-sec-visibility-toggle is-compact is-on-dark ${
                balanceUnlocked ? "is-active" : ""
              }`}
              onClick={toggleBalanceVisibility}
              aria-label={balanceToggleLabel}
              title={balanceToggleLabel}
              disabled={securityStatusLoading}
            >
              <i className={`pi ${balanceUnlocked ? "pi-eye-slash" : "pi-eye"}`} />
            </button>
          </div>
          {!hasSecurityCode && !securityStatusLoading && (
            <div className="text-warning small mt-2">
              Setup security code in Profile before unlocking balance.
            </div>
          )}
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
          <div className="col-xl-6 col-lg-6 col-12">
            <div className="nova-deck-layout">
              <div className="nova-deck-zone">
                <div className="nova-deck-stack">
                  {[...stackCards].reverse().map(({ layer, index, card }) => {
                    const isFrontLayer = layer === 0;
                    const renderCard = isFrontLayer ? resolvedSelectedCard : card;
                    const isVirtualRenderCard =
                      renderCard.displayType === "Virtual";
                    const showPanLoaderBadge =
                      isFrontLayer && showPanLoaderOnSelectedCard;
                    const cardNumberForRender =
                      !panUnlocked
                        ? CARD_NUMBER_PLACEHOLDER
                        : isFrontLayer && shouldLoadSelectedCardNumber
                        ? "Loading..."
                        : renderCard.displayNumber || CARD_NUMBER_PLACEHOLDER;
                    const cardExpiryForRender = showPanLoaderBadge
                      ? "Loading..."
                      : renderCard.displayExpiry || CARD_EXPIRY_PLACEHOLDER;
                    const cardCvvForRender = showPanLoaderBadge
                      ? "Loading..."
                      : renderCard.displayCvv || CARD_CVV_PLACEHOLDER;
                    return (
                      <button
                        key={`${renderCard.displayId}-${layer}`}
                        type="button"
                        className={`nova-deck-layer ${renderCard.themeClass} ${
                          layer === 0 ? "is-front" : ""
                        }`}
                        style={{ "--stack-depth": layer }}
                        onClick={() => setSelectedIndex(index)}
                        aria-label={`Show ${renderCard.displayName}`}
                      >
                        {layer === 0 ? (
                          <div className="nova-flip-card">
                            <div className="nova-flip-inner">
                              <div
                                className={`nova-flip-face nova-flip-front ${renderCard.themeClass}`}
                                style={{
                                  backgroundImage: `linear-gradient(135deg, rgba(10,26,46,0.58) 0%, rgba(12,22,38,0.22) 100%), url(${renderCard.images.front})`,
                                }}
                              >
                                {showPanLoaderBadge ? (
                                  <div
                                    className="nova-card-pan-loader"
                                    aria-live="polite"
                                  >
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                      aria-hidden="true"
                                    />
                                    <span>Loading PAN...</span>
                                  </div>
                                ) : null}
                                <div className="nova-card-name">
                                  {renderCard.displayName}
                                </div>
                                <div className="nova-card-number">
                                  {cardNumberForRender}
                                </div>
                                <div
                                  className={`nova-card-foot ${
                                    isVirtualRenderCard ? "" : "is-single"
                                  }`.trim()}
                                >
                                  {isVirtualRenderCard ? (
                                    <div>
                                      <span>VALID THRU</span>
                                      <strong>
                                        {panUnlocked
                                          ? cardExpiryForRender
                                          : CARD_EXPIRY_PLACEHOLDER}
                                      </strong>
                                    </div>
                                  ) : null}
                                  <div>
                                    <span>CARD HOLDER</span>
                                    <strong>{userName}</strong>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`nova-flip-face nova-flip-back ${renderCard.themeClass}`}
                                style={{
                                  backgroundImage: `linear-gradient(135deg, rgba(8,16,29,0.72) 0%, rgba(16,22,35,0.48) 100%), url(${renderCard.images.back})`,
                                }}
                              >
                                {showPanLoaderBadge ? (
                                  <div
                                    className="nova-card-pan-loader is-back"
                                    aria-live="polite"
                                  >
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                      aria-hidden="true"
                                    />
                                    <span>Loading PAN...</span>
                                  </div>
                                ) : null}
                                <div className="nova-card-stripe" />
                                {isVirtualRenderCard ? (
                                  <div className="nova-card-cvv-row">
                                    <span>CVV</span>
                                    <strong>
                                      {panUnlocked
                                        ? cardCvvForRender
                                        : CARD_CVV_PLACEHOLDER}
                                    </strong>
                                  </div>
                                ) : null}
                                <div className="nova-card-back-meta">
                                  <span>{cardNumberForRender}</span>
                                  <span>{renderCard.displayCurrency}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="nova-deck-shadow-card" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="nova-stack-hint">
                  {showNoCards
                    ? "No cards found"
                    : `${Math.max(availableCards.length - 1, 0)} cards behind`}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6 col-12">
            <div className="nova-card-live-block h-100">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <h5 className="nova-card-live-title mb-0">Card Details</h5>
              </div>
              {!hasSecurityCode && !securityStatusLoading && (
                <div className="text-warning small mb-2">
                  Setup security code in Profile before viewing PAN details.
                </div>
              )}
              <div className="nova-card-live-grid">
                {detailRows.map((item) => (
                  <div className="nova-card-live-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value ?? "N/A"}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* <div className="col-xl-4 col-lg-4 col-12">
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
          </div> */}
        </div>
      </div>

      <Modal
        show={securityPromptOpen}
        onHide={() => setSecurityPromptOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Security Code Required</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-2">
            Enter security code to view balance and card details.
          </p>
          <input
            type="password"
            className="form-control"
            value={securityCodeInput}
            onChange={(event) => setSecurityCodeInput(event.target.value)}
            placeholder="Security code"
          />
          {securityError ? (
            <div className="alert alert-danger mt-3 mb-0 py-2">
              {securityError}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setSecurityPromptOpen(false)}
            disabled={securitySubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submitSecurityPrompt}
            disabled={securitySubmitting}
          >
            {securitySubmitting ? "Verifying..." : "Verify"}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MainBalanceCard;
