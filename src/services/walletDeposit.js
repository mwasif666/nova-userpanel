import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../utils";
import { request } from "../utils/api";

const WalletDepositAddressesPanel = ({ networks = [] }) => {
  const [form, setForm] = useState({
    asset: "USDT",
    network: "",
  });

  const [rows, setRows] = useState([]);
  const [attentionPoints, setAttentionPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    if (form.network || networks.length === 0) return;

    const preferred =
      networks.find((n) => n.value === "TRC20")?.value || networks[0].value;

    setForm((prev) => ({ ...prev, network: preferred }));
  }, [form.network, networks]);

  const loadDepositAddresses = async () => {
    if (!form.asset) {
      setError("Asset is required.");
      return;
    }

    setLoading(true);
    setError("");
    setRows([]);
    setAttentionPoints([]);

    try {
      const res = await request({
        url: "app/wallet/deposit-addresses",
        method: "GET",
        params: {
          asset: form.asset,
          network: form.network,
        },
      });

      const data = res?.data?.data || {};

      setRows(data.addresses || []);
      setAttentionPoints(data.attention_points || []);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Failed to load deposit addresses.")
      );
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async (row) => {
    if (!row?.address) return;

    if (!navigator?.clipboard?.writeText) {
      setError("Clipboard access is not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(row.address);
      setCopiedId(row.id);

      setTimeout(() => setCopiedId(""), 1500);
    } catch {
      setError("Failed to copy the address.");
    }
  };

  return (
    <div className="card nova-panel h-100">
      <div className="card-body">
        <h5 className="mb-3">Deposit Addresses</h5>

        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Asset</label>
            <input
              className="form-control"
              value={form.asset}
              onChange={(e) =>
                setForm({ ...form, asset: e.target.value.toUpperCase() })
              }
              placeholder="USDT"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Network</label>
            <select
              className="form-select"
              value={form.network}
              onChange={(e) =>
                setForm({ ...form, network: e.target.value })
              }
            >
              <option value="">Auto</option>
              {networks.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <button
              className="btn btn-primary w-100"
              onClick={loadDepositAddresses}
              disabled={loading}
            >
              {loading ? "Loading..." : "Get Deposit Address"}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger mt-3">{error}</div>}

        <div className="mt-4">
          {!loading && rows.length === 0 ? (
            <div className="text-center text-muted">
              Fetch deposit address to see records.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="border p-3 mb-3 rounded">
                <div className="mb-2">
                  <strong>{row.network}</strong>
                </div>

                {row.qr && (
                  <div className="mb-2">
                    <img src={row.qr} alt="QR" width="120" />
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-break">{row.address}</div>

                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => copyAddress(row)}
                  >
                    {copiedId === row.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {attentionPoints.length > 0 && (
          <div className="alert alert-warning mt-3">
            <ul className="mb-0">
              {attentionPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDepositAddressesPanel;