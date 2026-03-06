import React, { useCallback, useEffect, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import {
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

  return Array.from(
    new Map(mapped.map((item) => [item.value.toUpperCase(), item])).values(),
  );
};

const extractDepositRows = (
  response,
  fallbackAsset = "USDT",
  fallbackNetwork = "",
) => {
  const payload = unwrapPayload(response);
  const assetEntries = Array.isArray(payload?.assets) ? payload.assets : [];

  if (assetEntries.length > 0) {
    return assetEntries.flatMap((assetEntry, assetIndex) => {
      const asset = String(
        assetEntry?.currency ||
          assetEntry?.asset ||
          assetEntry?.coin ||
          fallbackAsset ||
          "USDT",
      ).toUpperCase();

      const addresses = Array.isArray(assetEntry?.addresses)
        ? assetEntry.addresses
        : [];

      if (addresses.length === 0) {
        return [
          {
            id: `asset-${asset}-${assetIndex}`,
            asset,
            network: String(fallbackNetwork || "N/A").toUpperCase(),
            address: "N/A",
            memo: "-",
            qr: "",
            minDeposit: "-",
            confirmationsRequired: "-",
          },
        ];
      }

      return addresses.map((row, index) => {
        const network = String(
          row?.network ||
            row?.chain ||
            row?.network_type ||
            row?.protocol ||
            fallbackNetwork ||
            "N/A",
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
            "-",
          qr:
            row?.qr_code ||
            row?.qr ||
            row?.qrcode ||
            row?.qr_code_url ||
            row?.address_qr ||
            "",
          minDeposit: row?.min_deposit || row?.minimum_deposit || "-",
          confirmationsRequired:
            row?.confirmations_required || row?.confirmations || "-",
        };
      });
    });
  }

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
        "-",
      qr:
        row?.qr_code ||
        row?.qr ||
        row?.qrcode ||
        row?.qr_code_url ||
        row?.address_qr ||
        "",
      minDeposit: row?.min_deposit || row?.minimum_deposit || "-",
      confirmationsRequired:
        row?.confirmations_required || row?.confirmations || "-",
    };
  });
};

const Wallet = () => {
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
  const [attentionPoints, setAttentionPoints] = useState([]);
  const [copiedAddressId, setCopiedAddressId] = useState("");

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
    setAttentionPoints([]);

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
      setAttentionPoints(
        Array.isArray(response?.data?.attention_points)
          ? response.data.attention_points
          : Array.isArray(response?.attention_points)
            ? response.attention_points
            : [],
      );
    } catch (error) {
      setAddressError(
        extractApiErrorMessage(error, "Deposit addresses load nahi ho sakin."),
      );
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    loadNetworks().catch(() => undefined);
  }, [loadNetworks]);

  const copyAddress = async (row) => {
    const value = String(row?.address || "").trim();
    if (!value || value === "N/A") return;

    if (!navigator?.clipboard?.writeText) {
      setAddressError("Clipboard access available nahi hai.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedAddressId(row.id);
      window.setTimeout(() => setCopiedAddressId(""), 1800);
    } catch (error) {
      setAddressError("Address copy nahi ho saka.");
    }
  };

  return (
    <>
      <PageTitle motherMenu="Wallet" activeMenu="Wallet" />

      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel h-100">
            <div className="card-body">
              <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 mb-3">
                <div>
                  <div className="nova-flow-kicker mb-1">Wallet</div>
                  <h5 className="mb-0">Deposit Addresses</h5>
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

                <div className="nova-wallet-address-grid">
                  {!addressLoading && addressRows.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      Fetch deposit address to see records.
                    </div>
                  ) : (
                    addressRows.map((row) => (
                      <div key={row.id} className="nova-wallet-address-card">
                        <div className="nova-wallet-address-qr">
                          {row.qr ? (
                            <img src={row.qr} alt={`${row.network} deposit QR`} />
                          ) : (
                            <div className="nova-wallet-address-qr-empty">QR N/A</div>
                          )}
                        </div>

                        <div className="nova-wallet-address-info">
                          <span className="nova-wallet-address-chain">
                            {row.network || "N/A"}
                          </span>

                          <div className="nova-wallet-address-row">
                            <div className="nova-wallet-address-value">
                              {row.address || "N/A"}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => copyAddress(row)}
                              disabled={!row.address || row.address === "N/A"}
                            >
                              <i
                                className={`pi ${
                                  copiedAddressId === row.id ? "pi-check" : "pi-copy"
                                }`}
                              />{" "}
                              {copiedAddressId === row.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {attentionPoints.length > 0 ? (
                  <div className="alert alert-warning py-2 mt-3 mb-0">
                    <ul className="mb-0 ps-3">
                      {attentionPoints.map((point, index) => (
                        <li key={`${point}-${index}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* {addressRawResponse ? (
                  <div className="nova-flow-response">
                    <div className="nova-flow-response-head">
                      <span>Deposit Address Response</span>
                      <small>GET /wallet/deposit-addresses</small>
                    </div>
                    <pre>{JSON.stringify(addressRawResponse, null, 2)}</pre>
                  </div>
                ) : null} */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Wallet;
