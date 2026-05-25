import { useEffect, useState } from "react";
import { request } from "../../../utils/api";

const WalletDepositAddressesPanel = ({ networks = [] }) => {
  const [addressForm, setAddressForm] = useState({ asset: "USDT", network: "" });
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressRows, setAddressRows] = useState([]);
  const [attentionPoints, setAttentionPoints] = useState([]);
  const [copiedAddressId, setCopiedAddressId] = useState("");
  const [addressSearchDone, setAddressSearchDone] = useState(false);

  useEffect(() => {
    if (addressForm.network || networks.length === 0) return;
    const preferred =
      networks.find((item) => item.value === "TRC20")?.value || networks[0]?.value;
    setAddressForm((prev) => ({ ...prev, network: preferred }));
  }, [addressForm.network, networks]);

  const selectedNetwork = networks.find((n) => n.value === addressForm.network);

  const loadDepositAddresses = async () => {
    if (!String(addressForm.asset || "").trim()) {
      setAddressError("Asset is required.");
      return;
    }
    setAddressLoading(true);
    setAddressError("");
    setAddressRows([]);
    setAttentionPoints([]);
    setAddressSearchDone(false);
    try {
      const params = { asset: addressForm.asset };
      if (addressForm.network) params.network = addressForm.network;
      const res = await request({ url: "wallet/deposit-addresses", method: "GET", params });
      const body = res?.data || {};
      const assets = body?.data?.assets || body?.assets || [];
      const rows = [];
      assets.forEach((asset) => {
        if (Array.isArray(asset.addresses) && asset.addresses.length > 0) {
          asset.addresses.forEach((item, index) => {
            rows.push({
              id: `${item.network || asset.currency}-${index}`,
              network: item.network || asset.currency || "N/A",
              address: item.address || item.deposit_address || item.wallet_address || "",
              qr: item.qr_code || item.qr || "",
            });
          });
        }
      });
      setAddressRows(rows);
      const attPts = body?.attention_points || body?.data?.attention_points || [];
      setAttentionPoints(Array.isArray(attPts) ? attPts : []);
      setAddressSearchDone(true);
    } catch (error) {
      const data = error?.response?.data || {};
      const errMsg =
        (data?.errors && Object.values(data.errors).flat().find(Boolean)) ||
        data?.message ||
        data?.msg ||
        error?.message ||
        "Failed to load deposit addresses.";
      setAddressError(String(errMsg));
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
      setAddressError("Failed to copy. Please try again.");
    }
  };

  return (
    <div className="nova-deposit-wrap">
      {/* Form row */}
      <div className="nova-deposit-form-row">
        <div className="nova-deposit-field">
          <label className="nova-deposit-label">Asset</label>
          <input
            type="text"
            className="nova-deposit-input"
            value={addressForm.asset}
            onChange={(e) =>
              setAddressForm((prev) => ({ ...prev, asset: e.target.value.toUpperCase() }))
            }
            placeholder="USDT"
          />
        </div>

        <div className="nova-deposit-field">
          <label className="nova-deposit-label">Network</label>
          <select
            className="nova-deposit-input"
            value={addressForm.network}
            onChange={(e) =>
              setAddressForm((prev) => ({ ...prev, network: e.target.value }))
            }
          >
            <option value="">Select Network</option>
            {networks.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="nova-deposit-cta"
          onClick={loadDepositAddresses}
          disabled={addressLoading}
        >
          {addressLoading ? (
            <><span className="spinner-border spinner-border-sm me-2" />Fetching...</>
          ) : (
            <><i className="pi pi-download me-2" />Get Deposit Address</>
          )}
        </button>
      </div>

      {/* Network info strip */}
      {selectedNetwork && (
        <div className="nova-deposit-info-strip">
          <div className="nova-deposit-info-item">
            <i className="pi pi-info-circle" />
            <span className="nova-deposit-info-label">Network</span>
            <strong>{selectedNetwork.label}</strong>
          </div>
          <div className="nova-deposit-info-divider" />
          <div className="nova-deposit-info-item">
            <i className="pi pi-send" />
            <span className="nova-deposit-info-label">Min Withdrawal Fee</span>
            <strong>{selectedNetwork.withdrawal_fee ?? "N/A"} USDT</strong>
          </div>
          <div className="nova-deposit-info-divider" />
          <div className="nova-deposit-info-item">
            <i className="pi pi-wallet" />
            <span className="nova-deposit-info-label">Min Withdrawal Amount</span>
            <strong>{selectedNetwork.min_withdrawal ?? "N/A"} USDT</strong>
          </div>
        </div>
      )}

      {/* Error */}
      {addressError && (
        <div className="nova-kyc-feedback is-error mt-3">
          <i className="fa fa-exclamation-circle" />
          <span>{addressError}</span>
        </div>
      )}

      {/* Address cards */}
      {addressRows.length > 0 ? (
        <div className="nova-deposit-address-list mt-4">
          {addressRows.map((row) => (
            <div key={row.id} className="nova-deposit-address-card">
              {row.qr ? (
                <div className="nova-deposit-address-qr">
                  <img src={row.qr} alt={`${row.network} QR`} />
                </div>
              ) : null}
              <div className="nova-deposit-address-body">
                <span className="nova-deposit-address-network">
                  <i className="pi pi-globe me-1" />{row.network || "N/A"}
                </span>
                <div className="nova-deposit-address-value">
                  {row.address || "N/A"}
                </div>
                <button
                  type="button"
                  className={`nova-deposit-copy-btn ${copiedAddressId === row.id ? "is-copied" : ""}`}
                  onClick={() => copyAddress(row)}
                  disabled={!row.address}
                >
                  <i className={`pi ${copiedAddressId === row.id ? "pi-check" : "pi-copy"} me-1`} />
                  {copiedAddressId === row.id ? "Copied!" : "Copy Address"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !addressLoading ? (
        <div className="nova-deposit-empty">
          <i className="pi pi-wallet nova-deposit-empty-icon" />
          {addressSearchDone ? (
            <>
              <p><strong>No deposit address found</strong> for {addressForm.asset}.</p>
              <p className="text-muted small mt-1">Your deposit address may not be activated yet. Please contact support to enable it for your account.</p>
            </>
          ) : (
            <p>Select a network and click <strong>Get Deposit Address</strong> to see your deposit address.</p>
          )}
        </div>
      ) : null}

      {/* Attention points */}
      {attentionPoints.length > 0 && (
        <div className="nova-deposit-attention mt-3">
          <div className="nova-deposit-attention-title">
            <i className="pi pi-exclamation-triangle me-2" />Important
          </div>
          <ul>
            {attentionPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WalletDepositAddressesPanel;
