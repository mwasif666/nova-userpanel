import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUsdtWalletDepositBinancePay,
  getUsdtWalletBinancePayStatus,
  getWalletDepositAddresses,
  getWalletNetworks,
} from "../../../services/walletDeposit";

const unwrapPayload = (response) => {
  if (!response || typeof response !== "object") return {};
  if (response?.data?.data && typeof response.data.data === "object") {
    return response.data.data;
  }
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response;
};

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

const pickNetworkCode = (network) => {
  if (!network) return "";
  if (typeof network === "string") return network.trim();
  return String(
    network?.network ||
      network?.code ||
      network?.value ||
      network?.name ||
      network?.id ||
      "",
  ).trim();
};

const extractNetworksList = (response) => {
  const payload = unwrapPayload(response);
  const directArrays = [
    payload,
    payload?.networks,
    payload?.supported_networks,
    payload?.items,
    payload?.list,
    payload?.data,
  ];

  const source = directArrays.find(Array.isArray) || [];
  const mapped = source
    .map((item) => {
      if (typeof item === "string") {
        const value = item.trim();
        if (!value) return null;
        return { value, label: value };
      }

      const value = pickNetworkCode(item);
      if (!value) return null;
      return {
        value,
        label: String(item?.label || item?.name || value),
      };
    })
    .filter(Boolean);

  const deduped = Array.from(
    new Map(mapped.map((item) => [item.value.toUpperCase(), item])).values(),
  );

  return deduped;
};

const extractDepositRows = (response, fallbackAsset = "USDT", fallbackNetwork = "") => {
  const payload = unwrapPayload(response);
  const arrays = [
    payload,
    payload?.addresses,
    payload?.items,
    payload?.list,
    payload?.data,
  ];
  const sourceArray = arrays.find(Array.isArray);

  const rows = sourceArray
    ? sourceArray
    : payload && typeof payload === "object"
      ? [payload]
      : [];

  return rows.map((row, index) => {
    const network = String(
      row?.network ||
        row?.chain ||
        row?.network_type ||
        row?.protocol ||
        fallbackNetwork ||
        "N/A",
    ).toUpperCase();

    const asset = String(
      row?.asset || row?.currency || row?.coin || fallbackAsset || "USDT",
    ).toUpperCase();

    return {
      id: `${network}-${asset}-${row?.address || row?.deposit_address || index}`,
      asset,
      network,
      address:
        row?.address ||
        row?.deposit_address ||
        row?.wallet_address ||
        row?.to_address ||
        "N/A",
      memo:
        row?.memo ||
        row?.tag ||
        row?.address_tag ||
        row?.memo_tag ||
        row?.payment_id ||
        "—",
      qr:
        row?.qr_code ||
        row?.qr ||
        row?.qrcode ||
        row?.qr_code_url ||
        row?.address_qr ||
        "",
    };
  });
};

const findFirstByKeys = (source, keys = []) => {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value === null || value === undefined) continue;
      const output = String(value).trim();
      if (output) return output;
    }
  }

  for (const value of Object.values(source)) {
    if (value && typeof value === "object") {
      const nested = findFirstByKeys(value, keys);
      if (nested) return nested;
    }
  }

  return "";
};

const WalletDepositPanel = ({ onWalletUpdated }) => {
  const [activeTab, setActiveTab] = useState("addresses");
  const [networks, setNetworks] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState("");

  const [addressForm, setAddressForm] = useState({
    asset: "USDT",
    network: "",
  });
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressRows, setAddressRows] = useState([]);
  const [addressRawResponse, setAddressRawResponse] = useState(null);

  const [binanceForm, setBinanceForm] = useState({
    amount: "",
    currency: "USDT",
    network: "TRC20",
  });
  const [binanceCreateLoading, setBinanceCreateLoading] = useState(false);
  const [binanceCreateError, setBinanceCreateError] = useState("");
  const [binanceCreateResponse, setBinanceCreateResponse] = useState(null);

  const [statusForm, setStatusForm] = useState({
    merchantTradeNo: "",
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusResponse, setStatusResponse] = useState(null);

  const loadNetworks = useCallback(async () => {
    setNetworkLoading(true);
    setNetworkError("");

    try {
      const response = await getWalletNetworks();
      const list = extractNetworksList(response);
      setNetworks(list);

      if (list.length > 0) {
        setAddressForm((prev) => ({
          ...prev,
          network:
            prev.network ||
            list.find((item) => item.value === "TRC20")?.value ||
            list[0].value,
        }));
        setBinanceForm((prev) => ({
          ...prev,
          network:
            prev.network ||
            list.find((item) => item.value === "TRC20")?.value ||
            list[0].value,
        }));
      }
    } catch (error) {
      setNetworkError(
        extractApiErrorMessage(error, "Supported networks load nahi ho sakin."),
      );
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  const loadDepositAddresses = async () => {
    if (!String(addressForm.asset || "").trim()) {
      setAddressError("Asset is required.");
      return;
    }

    setAddressLoading(true);
    setAddressError("");
    setAddressRows([]);
    setAddressRawResponse(null);

    try {
      const response = await getWalletDepositAddresses({
        asset: addressForm.asset,
        network: addressForm.network,
      });
      const rows = extractDepositRows(
        response,
        addressForm.asset,
        addressForm.network,
      );
      setAddressRows(rows);
      setAddressRawResponse(response);
    } catch (error) {
      setAddressError(
        extractApiErrorMessage(error, "Deposit addresses load nahi ho sakin."),
      );
    } finally {
      setAddressLoading(false);
    }
  };

  const createBinancePayDeposit = async () => {
    if (!String(binanceForm.amount || "").trim()) {
      setBinanceCreateError("Amount is required.");
      return;
    }
    if (!String(binanceForm.currency || "").trim()) {
      setBinanceCreateError("Currency is required.");
      return;
    }

    setBinanceCreateLoading(true);
    setBinanceCreateError("");
    setBinanceCreateResponse(null);

    try {
      const response = await createUsdtWalletDepositBinancePay({
        amount: binanceForm.amount,
        currency: binanceForm.currency,
        network: binanceForm.network,
      });
      setBinanceCreateResponse(response);

      const merchantTradeNo = findFirstByKeys(response, [
        "merchant_trade_no",
        "merchantTradeNo",
        "trade_no",
        "merchant_order_no",
      ]);

      if (merchantTradeNo) {
        setStatusForm({ merchantTradeNo });
      }
    } catch (error) {
      setBinanceCreateError(
        extractApiErrorMessage(error, "Binance Pay request create nahi ho saka."),
      );
    } finally {
      setBinanceCreateLoading(false);
    }
  };

  const checkBinanceStatus = async () => {
    if (!String(statusForm.merchantTradeNo || "").trim()) {
      setStatusError("merchant_trade_no is required.");
      return;
    }

    setStatusLoading(true);
    setStatusError("");
    setStatusResponse(null);

    try {
      const response = await getUsdtWalletBinancePayStatus({
        merchantTradeNo: statusForm.merchantTradeNo,
      });
      setStatusResponse(response);

      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (error) {
      setStatusError(
        extractApiErrorMessage(error, "Binance Pay status fetch nahi ho saka."),
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const merchantTradeNoFromCreate = useMemo(
    () =>
      findFirstByKeys(binanceCreateResponse || {}, [
        "merchant_trade_no",
        "merchantTradeNo",
        "trade_no",
        "merchant_order_no",
      ]),
    [binanceCreateResponse],
  );

  const paymentLinkFromCreate = useMemo(
    () =>
      findFirstByKeys(binanceCreateResponse || {}, [
        "checkout_url",
        "universal_url",
        "payment_url",
        "qr_code_url",
        "url",
        "deeplink",
      ]),
    [binanceCreateResponse],
  );

  const statusLabel = useMemo(
    () =>
      findFirstByKeys(statusResponse || {}, [
        "status",
        "order_status",
        "pay_status",
        "trade_status",
        "state",
      ]),
    [statusResponse],
  );

  useEffect(() => {
    loadNetworks().catch(() => undefined);
  }, [loadNetworks]);

  return (
    <div className="card nova-panel h-100">
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 mb-3">
          <div>
            <div className="nova-flow-kicker mb-1">Wallet Deposit APIs</div>
            <h4 className="mb-1">Networks + Deposit Address + Binance Pay</h4>
            <p className="mb-0 text-muted">
              `/wallet/networks`, `/wallet/deposit-addresses`, and Binance Pay
              create/status endpoints integrated.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={loadNetworks}
            disabled={networkLoading}
          >
            {networkLoading ? "Refreshing..." : "Refresh Networks"}
          </button>
        </div>

        {networkError ? (
          <div className="alert alert-warning py-2">{networkError}</div>
        ) : null}

        {networks.length > 0 ? (
          <div className="nova-bind-helper mb-3">
            <div className="nova-bind-helper-title">Supported Networks</div>
            <div className="nova-bind-helper-list">
              {networks.map((item) => (
                <span key={item.value}>{item.label}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="nova-flow-switch mb-3" role="tablist" aria-label="Deposit tabs">
          <button
            type="button"
            className={`nova-flow-switch-btn ${activeTab === "addresses" ? "is-active" : ""}`}
            onClick={() => setActiveTab("addresses")}
          >
            <span className="nova-flow-switch-title">Deposit Addresses</span>
            <span className="nova-flow-switch-sub">
              GET `/wallet/deposit-addresses?asset=USDT`
            </span>
          </button>
          <button
            type="button"
            className={`nova-flow-switch-btn ${activeTab === "binance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("binance")}
          >
            <span className="nova-flow-switch-title">Binance Pay</span>
            <span className="nova-flow-switch-sub">
              POST create + GET status flow
            </span>
          </button>
        </div>

        {activeTab === "addresses" ? (
          <div className="nova-flow-shell">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="nova-flow-field">
                  <span className="nova-flow-field-label">Asset</span>
                  <input
                    type="text"
                    className="form-control nova-flow-input"
                    value={addressForm.asset}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        asset: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="USDT"
                  />
                </label>
              </div>
              <div className="col-md-4">
                <label className="nova-flow-field">
                  <span className="nova-flow-field-label">Network</span>
                  <select
                    className="form-select nova-flow-input"
                    value={addressForm.network}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        network: event.target.value,
                      }))
                    }
                  >
                    <option value="">Auto / Any</option>
                    {networks.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="col-md-4">
                <button
                  type="button"
                  className="btn btn-primary w-100"
                  onClick={loadDepositAddresses}
                  disabled={addressLoading}
                >
                  {addressLoading ? "Loading..." : "Get Deposit Address"}
                </button>
              </div>
            </div>

            {addressError ? (
              <div className="nova-flow-alert is-error">
                <i className="pi pi-exclamation-triangle" />
                <span>{addressError}</span>
              </div>
            ) : null}

            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Network</th>
                    <th>Deposit Address</th>
                    <th>Memo/Tag</th>
                    <th>QR</th>
                  </tr>
                </thead>
                <tbody>
                  {!addressLoading && addressRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Fetch deposit address to see records.
                      </td>
                    </tr>
                  ) : (
                    addressRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.asset}</td>
                        <td>{row.network}</td>
                        <td className="text-break">{row.address}</td>
                        <td>{row.memo}</td>
                        <td>
                          {row.qr ? (
                            <a
                              href={row.qr}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-light"
                            >
                              Open QR
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {addressRawResponse ? (
              <div className="nova-flow-response">
                <div className="nova-flow-response-head">
                  <span>Deposit Address Response</span>
                  <small>GET /wallet/deposit-addresses</small>
                </div>
                <pre>{JSON.stringify(addressRawResponse, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-xl-6">
              <div className="nova-flow-shell">
                <div className="nova-flow-section">
                  <div className="nova-flow-section-head">
                    <h6 className="mb-0">Create Binance Pay Deposit</h6>
                    <small>POST /app/usdt/wallet/deposit/binance-pay</small>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="nova-flow-field">
                        <span className="nova-flow-field-label">Amount</span>
                        <input
                          type="number"
                          className="form-control nova-flow-input"
                          value={binanceForm.amount}
                          onChange={(event) =>
                            setBinanceForm((prev) => ({
                              ...prev,
                              amount: event.target.value,
                            }))
                          }
                          placeholder="10"
                        />
                      </label>
                    </div>
                    <div className="col-md-4">
                      <label className="nova-flow-field">
                        <span className="nova-flow-field-label">Currency</span>
                        <input
                          type="text"
                          className="form-control nova-flow-input"
                          value={binanceForm.currency}
                          onChange={(event) =>
                            setBinanceForm((prev) => ({
                              ...prev,
                              currency: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="USDT"
                        />
                      </label>
                    </div>
                    <div className="col-md-4">
                      <label className="nova-flow-field">
                        <span className="nova-flow-field-label">Network</span>
                        <select
                          className="form-select nova-flow-input"
                          value={binanceForm.network}
                          onChange={(event) =>
                            setBinanceForm((prev) => ({
                              ...prev,
                              network: event.target.value,
                            }))
                          }
                        >
                          <option value="">Auto / Any</option>
                          {networks.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="nova-flow-actions mt-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={createBinancePayDeposit}
                      disabled={binanceCreateLoading}
                    >
                      {binanceCreateLoading
                        ? "Creating..."
                        : "Create Binance Pay Deposit"}
                    </button>
                  </div>
                </div>

                {binanceCreateError ? (
                  <div className="nova-flow-alert is-error">
                    <i className="pi pi-exclamation-triangle" />
                    <span>{binanceCreateError}</span>
                  </div>
                ) : null}

                {binanceCreateResponse ? (
                  <>
                    <div className="nova-bind-helper">
                      <div className="nova-bind-helper-title">Create Result</div>
                      <div className="nova-bind-helper-list">
                        <span>
                          Merchant Trade No: {merchantTradeNoFromCreate || "N/A"}
                        </span>
                        {paymentLinkFromCreate ? (
                          <span>
                            <a href={paymentLinkFromCreate} target="_blank" rel="noreferrer">
                              Open Payment Link
                            </a>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="nova-flow-response">
                      <div className="nova-flow-response-head">
                        <span>Create Response</span>
                        <small>POST /app/usdt/wallet/deposit/binance-pay</small>
                      </div>
                      <pre>{JSON.stringify(binanceCreateResponse, null, 2)}</pre>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="col-xl-6">
              <div className="nova-flow-shell">
                <div className="nova-flow-section">
                  <div className="nova-flow-section-head">
                    <h6 className="mb-0">Check Binance Pay Status</h6>
                    <small>GET /app/usdt/wallet/binance-pay/status</small>
                  </div>
                  <label className="nova-flow-field mb-2">
                    <span className="nova-flow-field-label">merchant_trade_no</span>
                    <input
                      type="text"
                      className="form-control nova-flow-input"
                      value={statusForm.merchantTradeNo}
                      onChange={(event) =>
                        setStatusForm({ merchantTradeNo: event.target.value })
                      }
                      placeholder="BNC177046238089PSTVTT5HMARXGQG5V"
                    />
                  </label>
                  <div className="nova-flow-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={checkBinanceStatus}
                      disabled={statusLoading}
                    >
                      {statusLoading ? "Checking..." : "Check Status"}
                    </button>
                  </div>
                </div>

                {statusError ? (
                  <div className="nova-flow-alert is-error">
                    <i className="pi pi-exclamation-triangle" />
                    <span>{statusError}</span>
                  </div>
                ) : null}

                {statusResponse ? (
                  <>
                    <div className="nova-bind-helper">
                      <div className="nova-bind-helper-title">Latest Status</div>
                      <div className="nova-bind-helper-list">
                        <span>
                          Merchant Trade No:{" "}
                          {String(statusForm.merchantTradeNo || "N/A")}
                        </span>
                        <span>Status: {statusLabel || "N/A"}</span>
                      </div>
                    </div>
                    <div className="nova-flow-response">
                      <div className="nova-flow-response-head">
                        <span>Status Response</span>
                        <small>GET /app/usdt/wallet/binance-pay/status</small>
                      </div>
                      <pre>{JSON.stringify(statusResponse, null, 2)}</pre>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDepositPanel;
