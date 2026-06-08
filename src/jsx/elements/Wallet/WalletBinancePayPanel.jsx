import { useEffect, useMemo, useState } from "react";
import { request } from "../../../utils/api";

const WalletBinancePayPanel = ({ networks = [] }) => {
  const [binanceForm, setBinanceForm] = useState({
    amount: "",
    currency: "USDT",
    network: "",
  });

  const [binanceCreateLoading, setBinanceCreateLoading] = useState(false);
  const [binanceCreateError, setBinanceCreateError] = useState("");
  const [binanceCreateResponse, setBinanceCreateResponse] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");

  const [statusForm, setStatusForm] = useState({ merchantTradeNo: "" });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusResponse, setStatusResponse] = useState(null);

  useEffect(() => {
    if (binanceForm.network || networks.length === 0) return;
    const preferred =
      networks.find((n) => n.value === "TRC20")?.value || networks[0]?.value;
    setBinanceForm((prev) => ({ ...prev, network: preferred }));
  }, [networks]);

  const createBinancePayDeposit = async () => {
    if (!binanceForm.amount) { setBinanceCreateError("Amount is required."); return; }
    if (!binanceForm.currency) { setBinanceCreateError("Currency is required."); return; }
    setBinanceCreateLoading(true);
    setBinanceCreateError("");
    setBinanceCreateResponse(null);
    try {
      const res = await request({
        url: "app/usdt/wallet/deposit/binance-pay",
        method: "POST",
        data: { amount: binanceForm.amount, currency: binanceForm.currency, network: binanceForm.network || "TRC20" },
      });
      setBinanceCreateResponse(res?.data);
      const merchantTradeNo = res?.data?.merchant_trade_no;
      window.open(res?.data?.checkout_url, "_blank");
      if (merchantTradeNo) setStatusForm({ merchantTradeNo });
    } catch (error) {
      setBinanceCreateError(error?.response?.data?.message || "Failed to create Binance Pay deposit.");
    } finally {
      setBinanceCreateLoading(false);
    }
  };

  const checkBinanceStatus = async () => {
    if (!statusForm.merchantTradeNo) { setStatusError("Merchant Trade No is required."); return; }
    setStatusLoading(true);
    setStatusError("");
    setStatusResponse(null);
    try {
      const res = await request({
        url: `app/usdt/wallet/binance-pay/status?merchant_trade_no=${statusForm.merchantTradeNo}`,
        method: "GET",
      });
      setStatusResponse(res.data.binance_status);
    } catch (error) {
      setStatusError(error?.response?.data?.message || "Failed to fetch Binance Pay status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const merchantTradeNoFromCreate = useMemo(() => {
    if (!binanceCreateResponse) return null;
    return (
      binanceCreateResponse?.merchant_trade_no ||
      binanceCreateResponse?.merchantTradeNo ||
      binanceCreateResponse?.trade_no ||
      binanceCreateResponse?.merchant_order_no
    );
  }, [binanceCreateResponse]);

  const paymentLinkFromCreate = useMemo(() => {
    if (!binanceCreateResponse) return null;
    return (
      binanceCreateResponse?.checkout_url ||
      binanceCreateResponse?.payment_url ||
      binanceCreateResponse?.universal_url ||
      binanceCreateResponse?.qr_code_url ||
      binanceCreateResponse?.deeplink ||
      null
    );
  }, [binanceCreateResponse]);

  const statusLabel = useMemo(() => {
    if (!statusResponse) return null;
    return statusResponse?.status;
  }, [statusResponse]);

  const statusTone = useMemo(() => {
    const s = String(statusLabel || "").toUpperCase();
    if (s === "INITIAL") return "info";
    if (["PENDING", "PROCESSING"].includes(s)) return "warning";
    if (["PAID", "SUCCESS"].includes(s)) return "success";
    if (["FAIL", "CANCEL", "EXPIRE"].includes(s)) return "danger";
    return "secondary";
  }, [statusLabel]);

  const openCheckoutPage = () => {
    if (!paymentLinkFromCreate) return;
    const w = window.open(paymentLinkFromCreate, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = paymentLinkFromCreate;
  };

  const copyCheckoutUrl = async () => {
    if (!paymentLinkFromCreate) return;
    try {
      await navigator.clipboard.writeText(paymentLinkFromCreate);
    } catch {
      const input = document.createElement("input");
      input.value = paymentLinkFromCreate;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2500);
  };

  return (
    <div className="nova-binance-wrap">
      <div className="nova-binance-head">
        <div className="nova-flow-kicker nova-binance-kicker mb-1">Wallet</div>
        <h4 className="nova-binance-title mb-1">Binance Pay Deposit</h4>
        <p className="nova-binance-subtitle">
          Create a Binance Pay deposit or check the status of an existing transaction.
        </p>
      </div>

      <div className="nova-binance-grid">
        {/* ── Create panel ── */}
        <div className="nova-binance-card">
          <div className="nova-binance-card-head">
            <span className="nova-binance-card-ico">
              <i className="pi pi-credit-card" />
            </span>
            <h6 className="nova-binance-card-title">Create Binance Pay Deposit</h6>
          </div>

          <div className="nova-binance-fields">
            <div className="nova-binance-field">
              <label className="nova-binance-label">Amount</label>
              <input
                type="number"
                className="nova-binance-input"
                value={binanceForm.amount}
                onChange={(e) => setBinanceForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter Amount"
              />
            </div>
            <div className="nova-binance-field">
              <label className="nova-binance-label">Currency</label>
              <input
                className="nova-binance-input"
                value={binanceForm.currency}
                onChange={(e) => setBinanceForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="nova-binance-field">
              <label className="nova-binance-label">Network</label>
              <select
                className="nova-binance-input"
                value={binanceForm.network}
                onChange={(e) => setBinanceForm((prev) => ({ ...prev, network: e.target.value }))}
              >
                <option value="">Select</option>
                {networks.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="nova-binance-cta"
            onClick={createBinancePayDeposit}
            disabled={binanceCreateLoading}
          >
            <span className="nova-binance-cta-icon">
              <i className={`pi ${binanceCreateLoading ? "pi-spin pi-spinner" : "pi-send"}`} />
            </span>
            <span className="nova-binance-cta-label">
              {binanceCreateLoading ? "Creating..." : "Create Binance Pay Deposit"}
            </span>
          </button>

          {binanceCreateError && (
            <div className="nova-kyc-feedback is-error mt-3">
              <i className="fa fa-exclamation-circle" />
              <span>{binanceCreateError}</span>
            </div>
          )}

          {binanceCreateResponse && (
            <div className="nova-binance-result mt-3">
              <div className="nova-binance-result-row">
                <span className="nova-binance-result-label">Merchant Trade No</span>
                <span className="nova-binance-result-value">{merchantTradeNoFromCreate || "N/A"}</span>
              </div>
              {paymentLinkFromCreate && (
                <div className="nova-binance-result-actions">
                  <button type="button" className="nova-binance-action-btn is-primary" onClick={openCheckoutPage}>
                    <i className="pi pi-external-link me-1" />Open Checkout
                  </button>
                  <button type="button" className="nova-binance-action-btn" onClick={copyCheckoutUrl}>
                    <i className={`pi ${copySuccess ? "pi-check" : "pi-copy"} me-1`} />
                    {copySuccess || "Copy URL"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Status panel ── */}
        <div className="nova-binance-card">
          <div className="nova-binance-card-head">
            <span className="nova-binance-card-ico">
              <i className="pi pi-verified" />
            </span>
            <h6 className="nova-binance-card-title">Check Binance Pay Status</h6>
          </div>

          <div className="nova-binance-fields">
            <div className="nova-binance-field is-full">
              <label className="nova-binance-label">Merchant Trade No</label>
              <input
                className="nova-binance-input"
                placeholder="Enter Merchant Trade No"
                value={statusForm.merchantTradeNo}
                onChange={(e) => setStatusForm({ merchantTradeNo: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            className="nova-binance-cta"
            onClick={checkBinanceStatus}
            disabled={statusLoading}
          >
            <span className="nova-binance-cta-icon">
              <i className={`pi ${statusLoading ? "pi-spin pi-spinner" : "pi-search"}`} />
            </span>
            <span className="nova-binance-cta-label">
              {statusLoading ? "Checking..." : "Check Status"}
            </span>
          </button>

          {statusError && (
            <div className="nova-kyc-feedback is-error mt-3">
              <i className="fa fa-exclamation-circle" />
              <span>{statusError}</span>
            </div>
          )}

          {statusResponse && (
            <div className="nova-binance-result mt-3">
              <div className="nova-binance-result-row">
                <span className="nova-binance-result-label">Merchant Trade No</span>
                <span className="nova-binance-result-value">{statusForm.merchantTradeNo}</span>
              </div>
              <div className="nova-binance-result-row">
                <span className="nova-binance-result-label">Status</span>
                <span className={`nova-binance-status-badge is-${statusTone}`}>
                  {statusLabel || "N/A"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletBinancePayPanel;
