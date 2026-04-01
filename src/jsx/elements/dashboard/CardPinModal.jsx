import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { getApiErrorMessage } from "../../../utils";
import { getCardPinDetails } from "../../../services/dashboardWallet";

const CardPinModal = ({
  show = false,
  onHide,
  cardId = "",
  cardName = "Card",
  cardMasked = "****",
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [revealed, setRevealed] = useState(false);

  const hideSensitiveValue = () => {
    setRevealed(false);
  };

  const loadPin = async () => {
    const safeCardId = String(cardId || "").trim();
    if (!safeCardId) {
      setPin("");
      setError("Card id is missing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getCardPinDetails(safeCardId);
      setPin(data);
    } catch (requestError) {
      setPin("");
      setError(getApiErrorMessage(requestError, "Failed to load PIN details."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) {
      hideSensitiveValue();
      return;
    }

    loadPin().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, cardId]);

  useEffect(() => {
    if (!show) return undefined;

    const handleVisibility = () => {
      if (document.hidden) hideSensitiveValue();
    };

    const handleKeyDown = (event) => {
      const key = String(event?.key || "").toLowerCase();
      const isCopyShortcut = (event.ctrlKey || event.metaKey) && key === "c";
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && key === "p";
      const isPrintScreen = key === "printscreen";

      if (isCopyShortcut || isPrintShortcut || isPrintScreen) {
        event.preventDefault();
        hideSensitiveValue();
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [show]);

  const pinLabel = pin || "Unavailable";
  const maskedPinLabel = pin
    ? "*".repeat(Math.max(String(pin).length, 4))
    : "Unavailable";
  const displayedPinLabel = revealed ? pinLabel : maskedPinLabel;

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <div className="modal-content nova-card-pin-modal">
        <div className="modal-header">
          <div>
            <h5 className="modal-title mb-1">PIN / ATM Withdrawal Password</h5>
            <div className="text-muted small">
              {cardName} ({cardMasked})
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onHide}
            aria-label="Close"
          />
        </div>

        <div className="modal-body">
          <div className="nova-card-pin-actions">
            <span className="nova-flow-kicker">Sensitive</span>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                loadPin().catch(() => undefined);
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="nova-card-pin-state">Loading PIN details...</div>
          ) : error ? (
            <div className="alert alert-warning py-2 mt-3 mb-0">{error}</div>
          ) : (
            <div className="nova-card-pin-panel mt-3">
              <div className="nova-card-pin-row">
                <span>PIN / ATM Withdrawal Password</span>
                <strong
                  className={`nova-sensitive-value ${revealed ? "is-revealed" : ""}`.trim()}
                  onCopy={(event) => event.preventDefault()}
                  onCut={(event) => event.preventDefault()}
                  onPaste={(event) => event.preventDefault()}
                >
                  {displayedPinLabel}
                </strong>
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={() => setRevealed((prev) => !prev)}
                disabled={loading}
              >
                {revealed ? "Hide PIN" : "Reveal PIN"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CardPinModal;
