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

  const [statusForm, setStatusForm] = useState({
    merchantTradeNo: "",
  });

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusResponse, setStatusResponse] = useState(null);

  useEffect(() => {
    if (binanceForm.network || networks.length === 0) return;

    const preferredNetwork =
      networks.find((n) => n.value === "TRC20")?.value || networks[0]?.value;

    setBinanceForm((prev) => ({
      ...prev,
      network: preferredNetwork,
    }));
  }, [networks]);

  const createBinancePayDeposit = async () => {
    if (!binanceForm.amount) {
      setBinanceCreateError("Amount is required.");
      return;
    }

    if (!binanceForm.currency) {
      setBinanceCreateError("Currency is required.");
      return;
    }

    setBinanceCreateLoading(true);
    setBinanceCreateError("");
    setBinanceCreateResponse(null);

    try {
      const res = await request({
        url: "app/usdt/wallet/deposit/binance-pay",
        method: "POST",
        data: {
          amount: binanceForm.amount,
          currency: binanceForm.currency,
          network: binanceForm.network || "TRC20",
        },
      });

      setBinanceCreateResponse(res?.data);
      const merchantTradeNo = res?.data?.merchant_trade_no;
      window.open(res?.data?.checkout_url, "_blank");

      if (merchantTradeNo) {
        setStatusForm({ merchantTradeNo });
      }
    } catch (error) {
      setBinanceCreateError(
        error?.response?.data?.message ||
          "Failed to create Binance Pay deposit.",
      );
    } finally {
      setBinanceCreateLoading(false);
    }
  };

  const checkBinanceStatus = async () => {
    if (!statusForm.merchantTradeNo) {
      setStatusError("Merchant Trade No is required.");
      return;
    }

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
      setStatusError(
        error?.response?.data?.message  ||  "Failed to fetch Binance Pay status."
      );
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
    return statusResponse?.status
  }, [statusResponse]);

const statusTone = useMemo(() => {
  const normalizedStatus = String(statusLabel || "").toUpperCase();

  switch (normalizedStatus) {
    case "INITIAL":
      return "info";       
    case "PENDING":
    case "PROCESSING":
      return "warning";
    case "PAID":
    case "SUCCESS":
      return "success";    
    case "FAIL":
    case "CANCEL":
    case "EXPIRE":
      return "danger";     
    default:
      return "secondary";
  }
}, [statusLabel]);
  const openCheckoutPage = () => {
    if (!paymentLinkFromCreate) return;

    const checkoutWindow = window.open(
      paymentLinkFromCreate,
      "_blank",
      "noopener,noreferrer",
    );

    if (!checkoutWindow) {
      window.location.href = paymentLinkFromCreate;
    }
  };

  const copyCheckoutUrl = async () => {
    if (!paymentLinkFromCreate) return;

    try {
      await navigator.clipboard.writeText(paymentLinkFromCreate);
      setCopySuccess("Checkout URL copied.");
    } catch (_) {
      const input = document.createElement("input");
      input.value = paymentLinkFromCreate;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopySuccess("Checkout URL copied.");
    }

    setTimeout(() => setCopySuccess(""), 2500);
  };

  return (
    <div className="card nova-panel h-100">
      <div className="card-body">
        <div className="nova-flow-kicker mb-1">Wallet</div>
        <h5 className="mb-3">Binance Pay Deposit</h5>

        <div className="row g-3">
          <div className="col-xl-6">
            <div className="nova-flow-shell">
              <h6>Create Binance Pay Deposit</h6>
              <div className="row g-3 mt-2">
                <div className="col-md-4">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={binanceForm.amount}
                    onChange={(e) =>
                      setBinanceForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Enter Amount"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Currency</label>
                  <input
                    className="form-control"
                    value={binanceForm.currency}
                    onChange={(e) =>
                      setBinanceForm((prev) => ({
                        ...prev,
                        currency: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Network</label>
                  <select
                    className="form-select"
                    value={binanceForm.network}
                    onChange={(e) =>
                      setBinanceForm((prev) => ({
                        ...prev,
                        network: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select </option>
                    {networks.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary mt-3"
                onClick={createBinancePayDeposit}
                disabled={binanceCreateLoading}
              >
                {binanceCreateLoading
                  ? "Creating..."
                  : "Create Binance Pay Deposit"}
              </button>

              {binanceCreateError && (
                <div className="alert alert-danger mt-3">
                  {binanceCreateError}
                </div>
              )}

              {binanceCreateResponse && (
                <div className="mt-3 border rounded-3 p-3 bg-light-subtle">
                  <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="small text-muted text-uppercase">
                        Merchant Trade No
                      </div>
                      <div className="fw-semibold">
                        {merchantTradeNoFromCreate || "N/A"}
                      </div>
                    </div>

                    {paymentLinkFromCreate && (
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={openCheckoutPage}
                        >
                          Open Binance Checkout
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={copyCheckoutUrl}
                        >
                          Copy Checkout URL
                        </button>
                      </div>
                    )}
                  </div>

                  {paymentLinkFromCreate && (
                    <div className="small text-muted mt-2">
                      Opens Binance checkout in a new page.
                      {copySuccess && <span className="ms-2">{copySuccess}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="col-xl-6">
            <div className="nova-flow-shell">
              <h6>Check Binance Pay Status</h6>
              <div className="mt-3">
                <label className="form-label">Merchant Trade No</label>

                <input
                  className="form-control"
                  placeholder="Enter Merchant Trade No"
                  value={statusForm.merchantTradeNo}
                  onChange={(e) =>
                    setStatusForm({ merchantTradeNo: e.target.value })
                  }
                />
              </div>

              <button
                className="btn btn-primary mt-3"
                onClick={checkBinanceStatus}
                disabled={statusLoading}
              >
                {statusLoading ? "Checking..." : "Check Status"}
              </button>

              {statusError && (
                <div className="alert alert-danger mt-3">{statusError}</div>
              )}

              {statusResponse && (
                <div className="mt-3 border rounded-3 p-3 bg-light-subtle">
                  <div className="small text-muted text-uppercase">
                    Merchant Trade No
                  </div>
                  <div className="fw-semibold">
                    {statusForm.merchantTradeNo}
                  </div>

                  <div className="mt-3 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div className="small text-muted text-uppercase">
                      Status
                    </div>
                    <span className={`badge text-bg-${statusTone}`} style={{color:"white"}}>
                      {statusLabel || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletBinancePayPanel;
