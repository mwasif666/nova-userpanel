import { useEffect, useState } from "react";
import { request } from "../../../utils/api";

const WalletDepositAddressesPanel = ({ networks = [] }) => {
  const [addressForm, setAddressForm] = useState({
    asset: "USDT",
    network: "",
  });

  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressRows, setAddressRows] = useState([]);
  const [attentionPoints, setAttentionPoints] = useState([]);
  const [copiedAddressId, setCopiedAddressId] = useState("");

  useEffect(() => {
    if (addressForm.network || networks.length === 0) return;

    const preferredNetwork =
      networks.find((item) => item.value === "TRC20")?.value ||
      networks[0]?.value;

    setAddressForm((prev) => ({
      ...prev,
      network: preferredNetwork,
    }));
  }, [addressForm.network, networks]);

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
      const params = {
        asset: addressForm.asset,
      };

      if (addressForm.network) {
        params.network = addressForm.network;
      }

      const res = await request({
        url: "wallet/deposit-addresses",
        method: "GET",
        params,
      });

      const assets = res?.data?.assets || [];

      let rows = [];

      assets.forEach((asset) => {
        if (Array.isArray(asset.addresses)) {
          asset.addresses.forEach((item, index) => {
            rows.push({
              id: `${item.network}-${index}`,
              network: item.network,
              address: item.address,
              qr: item.qr_code,
            });
          });
        }
      });

      setAddressRows(rows);

      setAttentionPoints(
        Array.isArray(res?.data?.attention_points)
          ? res.data.attention_points
          : []
      );
    } catch (error) {
      setAddressError(
        error?.response?.data?.message ||
          "Failed to load deposit addresses. Please try again."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  const copyAddress = async (row) => {
    const value = String(row?.address || "").trim();
    if (!value || value === "N/A") return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedAddressId(row.id);
      setTimeout(() => setCopiedAddressId(""), 1800);
    } catch {
      setAddressError("Failed to copy the address. Please try again.");
    }
  };

  return (
    <div className="card nova-panel h-100">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="nova-flow-kicker mb-1">Wallet</div>
            <h5 className="mb-0">Deposit Addresses</h5>
          </div>
        </div>

        <div className="nova-flow-shell">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="nova-flow-field">
                <span className="nova-flow-field-label">Asset</span>
                <input
                  type="text"
                  className="form-control nova-flow-input"
                  value={addressForm.asset}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      asset: e.target.value.toUpperCase(),
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
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      network: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Network</option>
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

          {addressError && (
            <div className="nova-flow-alert is-error">
              <span>{addressError}</span>
            </div>
          )}

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
                        disabled={!row.address}
                      >
                        {copiedAddressId === row.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {attentionPoints.length > 0 && (
            <div className="alert alert-warning py-2 mt-3 mb-0">
              <ul className="mb-0 ps-3">
                {attentionPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletDepositAddressesPanel;